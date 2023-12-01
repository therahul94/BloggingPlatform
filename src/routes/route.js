const express = require("express");
const router = express.Router();
const authorController = require("../controllers/authorController");
const blogController = require("../controllers/blogController");
const middleware = require("../middlewares/auth");

// Author
router.post("/authors", authorController.createAuthor);
router.post("/login", authorController.loginAuthor);

// Blogs
router.post("/blogs", middleware.authentication, blogController.createBlog);
router.get("/blogList", middleware.authentication, blogController.getBlogs);

router.put(
  "/updateblog/:blogId",
  middleware.authentication,
  middleware.authorisation,
  blogController.updateBlog
);

router.delete(
  "/deleteblogs/:blogId",
  middleware.authentication,
  middleware.authorisation,
  blogController.deleteBlog
);



module.exports = router;
