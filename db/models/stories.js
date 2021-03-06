'use strict';
module.exports = (sequelize, DataTypes) => {
  const Story = sequelize.define('Story', {
    userId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    text: DataTypes.TEXT,
    categoryId: DataTypes.INTEGER,
    imageURL: DataTypes.TEXT
  }, {});
  Story.associate = function (models) {
    Story.belongsTo(models.Category, {
      foreignKey: "categoryId"
    });
    Story.belongsTo(models.User, {
      foreignKey: "userId"
    });
    Story.hasMany(models.Comment, {
      foreignKey: "storyId",
      onDelete: "CASCADE",
      hooks: true
    });
    Story.hasMany(models.Like, {foreignKey: "storyId"});
  };
  return Story;
};
