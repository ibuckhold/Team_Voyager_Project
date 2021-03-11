const express = require('express');

const { User, Story, Category, Comment } = require("../db/models");
const { check, validationResult } = require('express-validator');
const { csrfProtection, asyncHandler } = require('../utils');

const router = express.Router();

const commentValidators = [
    check('text')
        .exists({ checkFalsy: true })
        .withMessage('Please provide comment text.')
        .isLength({ max: 500 })
        .withMessage('Comment must not be more than 500 characters long')
]

router.post("/create/:id(\\d+)", commentValidators, csrfProtection, asyncHandler(async (req, res) => {
    const storyId = parseInt(req.params.id, 10);
    if (req.session.auth) {
        const userId = req.session.auth.userId;
        const { text } = req.body;

        const newComment = Comment.build({
            userId,
            storyId,
            text
        });

        const validatorErrors = validationResult(req);

        if (validatorErrors.isEmpty()) {
            await newComment.save();
            return res.redirect(`/stories/${storyId}`);
        } else {
            const errors = validatorErrors.array().map((err) => err.msg);
            const story = await Story.findOne({
                include: {
                    model: Category
                },
                where: {
                    id: storyId
                }
            });

            const storyComments = await Comment.findAll({
                include: [{
                    model: User
                }],
                where: { storyId },
                order: [[
                    'createdAt', 'DESC'
                ]]
            });

            return res.render("display-story", {
                story,
                errors,
                storyComments
            });
        }
    }
    else return res.redirect(`/stories/${storyId}`);
}));

router.post("/edit/:id(\\d+)", commentValidators, csrfProtection, asyncHandler(async (req, res) => {
    if (req.session.auth) {
        const commentId = parseInt(req.params.id, 10);
        const comment = await Comment.findByPk(commentId);

        if (req.session.auth.userId !== comment.userId) {
            return res.redirect("/user/login");
        }

        const { text } = req.body;
        const { userId, storyId } = comment;

        const commentUpdated = {
            text,
            userId,
            storyId
        }

        const validatorErrors = validationResult(req);

        if (validatorErrors.isEmpty()) {
            await comment.update(commentUpdated);
            return res.redirect(`/stories/${storyId}`);
        } else {
            const errors = validatorErrors.array().map((err) => err.msg);
            const story = await Story.findOne({
                include: {
                    model: Category
                },
                where: {
                    id: storyId
                }
            });

            const storyComments = await Comment.findAll({
                include: {
                    model: User
                },
                where: { storyId },
                order: [[
                    'createdAt', 'DESC'
                ]]
            });

            return res.render("display-story", {
                story,
                errors,
                storyComments
            });
        }
    }
    else return res.redirect(`/stories/${storyId}`);
}));

router.post("/delete/:id(\\d+)", asyncHandler(async (req, res) => {
    const commentId = parseInt(req.params.id, 10);
    const comment = await Comment.findByPk(commentId);
    const storyId = comment.storyId
    await comment.destroy();
    return res.redirect(`/stories/${storyId}`);
}));

module.exports = router;