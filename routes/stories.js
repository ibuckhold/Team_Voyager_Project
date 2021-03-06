const express = require('express');
const multer = require('multer');
const { Op } = require("sequelize");

const { User, Story, Category, Comment, Like } = require("../db/models");
const { check, validationResult } = require('express-validator');
const { csrfProtection, asyncHandler } = require('../utils');

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
            cb(null, true)
        }
        else {
            cb(null, false)
            return cb(new Error('Only images files valid'))
        }
    }
}).single('imageupload')

router.get('/create', csrfProtection, async (req, res) => {
    const categories = await Category.findAll({
        order: [['name', 'ASC']]
    });
    const story = Story.build();
    return res.render('create-story', {
        title: 'Create New Story',
        story,
        categories,
        csrfToken: req.csrfToken()
    });
})

const storyValidators = [
    check('title')
        .exists({ checkFalsy: true })
        .withMessage('Please provide a title.')
        .isLength({ max: 100 })
        .withMessage('Title must not be more than 100 characters long'),
    check("text")
        .exists({ checkFalsy: true })
        .withMessage("Please provide story text.")
]

router.post('/create', upload, csrfProtection, storyValidators, asyncHandler(async (req, res) => {
    // User is logged in
    if (req.session.auth) {
        const {
            title,
            categoryId,
            text,
        } = req.body;
        const userId = req.session.auth.userId;
        const categoryIdParse = parseInt(categoryId, 10);
        let story = Story.build({
            title,
            text,
            userId
        });
        if (categoryIdParse) {
            story.categoryId = categoryIdParse;
        };
        if (req.file) {
            story.imageURL = '/images/' + req.file.filename;
            // story = Story.build({
            //     title,
            //     categoryId: categoryIdParse,
            //     text,
            //     userId,
            //     imageURL
            // });
        } //else {
        //     story = Story.build({
        //         title,
        //         categoryId: categoryIdParse,
        //         text,
        //         userId
        //     });
        // }

        const validatorErrors = validationResult(req);
        if (validatorErrors.isEmpty()) {
            await story.save();
            return res.redirect(`/stories/${story.id}`);
        } else {
            const categories = await Category.findAll({
                order: [['name', 'ASC']]
            });
            const errors = validatorErrors.array().map((err) => err.msg);
            return res.render('create-story', {
                title: 'Create New Story',
                errors,
                story,
                categories,
                csrfToken: req.csrfToken()
            });
        }
    }
    // User is not logged in
    return res.redirect("/login");
}));

router.get("/edit/:id(\\d+)", csrfProtection, asyncHandler(async (req, res) => {
    const categories = await Category.findAll({
        order: [['name', 'ASC']]
    });

    const storyId = parseInt(req.params.id, 10);

    const story = await Story.findByPk(storyId);



    return res.render('edit-story', {
        title: 'Edit Story',
        story,
        categories,
        csrfToken: req.csrfToken()
    });
}));

router.post("/edit/:id(\\d+)", upload, csrfProtection, storyValidators, asyncHandler(async (req, res) => {
    // If a user is logged in
    if (req.session.auth) {
        const storyId = parseInt(req.params.id, 10);
        const story = await Story.findByPk(storyId);

        const userId = req.session.auth.userId;
        const {
            title,
            categoryId,
            text
        } = req.body;

        let storyToUpdate;
        if (req.file) {
            const imageURL = '/images/' + req.file.filename;
            storyToUpdate = {
                title,
                categoryId,
                text,
                userId,
                imageURL
            };
        } else {
            storyToUpdate = {
                title,
                categoryId,
                text,
                userId
            };
        }


        const validatorErrors = validationResult(req);

        if (validatorErrors.isEmpty()) {
            await story.update(storyToUpdate);
            return res.redirect(`/stories/${storyId}`);
        } else {
            const categories = await Category.findAll({
                order: [['name', 'ASC']]
            });
            const errors = validatorErrors.array().map((err) => err.msg);
            return res.render('edit-story', {
                title: 'Edit Story',
                errors,
                story: { ...storyToUpdate, id: storyId },
                categories,
                csrfToken: req.csrfToken()
            });
        }
    }
    // If not logged in redirect to login page.
    else return res.redirect("/login");
}));

router.post("/delete/:id(\\d+)", asyncHandler(async (req, res) => {
    const storyId = parseInt(req.params.id, 10);
    const story = await Story.findByPk(storyId);
    await story.destroy();
    return res.redirect(`/${req.session.auth.userId}`);
}));

router.get("/:id(\\d+)", csrfProtection, asyncHandler(async (req, res) => {
    const storyId = parseInt(req.params.id, 10);
    const story = await Story.findOne({
        include: [{model: Category}, {model: User}],
        where: {
            id: storyId
        }
    });


    const storyComments = await Comment.findAll({
        include: [{
            model: User
        },
        {
            model: Like
        }],
        where: { storyId },
        order: [[
            'createdAt', 'DESC'
        ]]
    });

    let storyLikes = await Like.count({ where: { storyId } });

    // console.log(story)

    return res.render("display-story", {
        storyLikes,
        story,
        storyComments,
        csrfToken: req.csrfToken()
    });
}));


router.patch("/:id(\\d+)", asyncHandler(async (req, res) => {
    const storyId = req.params.id;
    const userId = req.session.auth.userId;

    let foundLike = await Like.findOne({
        where: {
            [Op.and]: [{ storyId }, { userId }]
        }
    });

    // if user liked this story, unlike it (destroy like)
    if (foundLike) {
        const dislike = await Like.findByPk(foundLike.id);
        await dislike.destroy();
    } else {
        await Like.create({ storyId, userId });
    }

    let storyLikes = await Like.count({ where: { storyId } });
    res.json({ likes: storyLikes });
}));

module.exports = router;
