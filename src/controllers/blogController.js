const blogModel = require("../models/blogModel");
const authorModel = require("../models/authorModel");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

//-----------------------------------------------------------------------------------------------------------------------------------------------------

function onlySpaces(str) {
  return /^\s*$/.test(str);
}

//------------------------------------------------------------------------------------------------------------------------------------------------------

const createBlog = async function (req, res) {
  try {
    let data = req.body;
    if (Object.keys(data).length != 0) {
      // If authorId is not entered
      let authorId = req.body.authorId;
      if (!authorId)
        return res
          .status(400)
          .send({ status: false, msg: "authorId is required" });

      // If authorId is invalid
      if (!mongoose.Types.ObjectId.isValid(authorId)) {
        return res
          .status(400)
          .send({ status: false, msg: "authorId is invalid" });
      }
      // If given authorId is not present in our database
      let validationAuthorId = await authorModel.findById(authorId);
      if (!validationAuthorId)
        return res
          .status(400)
          .send({ status: false, msg: "authorId does not exist" });

      // title validation
      if (!data.title)
        return res.status(400).send({
          status: false,
          msg: " Please enter title for the blog (Required Field)",
        });

      //body validation
      if (!data.body)
        return res.status(400).send({
          status: false,
          msg: " Please enter body for the blog (Required Field)",
        });

      //category validation
      if (!data.category)
        return res.status(400).send({
          status: false,
          msg: " Please enter category for the blog (Required Field)",
        });

      // isDeleted validation
      if (req.body.isDeleted === true) {
        return res
          .status(400)
          .send({ status: false, msg: "isDeleted cannot be true!" });
      }

      // only spaces validation
      for (const [key, value] of Object.entries(req.body)) {
        if (onlySpaces(`${value}`) == true) {
          return res.status(400).send({
            status: false,
            msg: "Empty Spaces are not accepted in " + `${key}`,
          });
        }
      }

      // AUTHORISATION: author "x" should not be able to create blog(s) using authorId of author "y"
      let token = req.headers["x-api-key"];
      let decodedToken = jwt.verify(token, process.env.userSecret);
      if (decodedToken.authorId !== req.body.authorId) {
        return res.status(404).send({
          status: false,
          msg: "Authorisation Failed! authorId is not IAW with token credentials",
        });
      }

      let blogCreated = await blogModel.create(data);
      if (data.isPublished == true) {
        blogCreated.publishedAt = new Date();
        await blogCreated.save();
      }
      res.status(201).send({ status: true, data: blogCreated });
    }
    // if request body does not contain any blog details
    else {
      return res
        .status(400)
        .send({ status: false, msg: "Please enter blog details!" });
    }
  } catch (err) {
    res.status(500).send({ msg: "Internal Server Error", error: err.message });
  }
};

//------------------------------------------------------------------------------------------------------------------------------------------------------

const getBlogs = async function (req, res) {
  try {
    let Blogs = await blogModel
      .find({ isDeleted: false })
      .populate("authorId");

    if (Blogs.length === 0) {
      return res
        .status(404)
        .send({ status: false, msg: "We are sorry; Blog(s) does not exist" });
    }
    // If there exists blog(s) satisfying the conditions
    if (Blogs.length !== 0) {
      res.status(200).send({ status: true, msg: Blogs });
    }
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

//----------------------------------------------------------------------------------------------------------------------------------------------------

const updateBlog = async function (req, res) {
  try {
    var today = new Date();
    let blogId = req.params.blogId;

    // blogId VALIDATION is already done in authorisation middleware

    //Creating an object named fieldToUpdate with all the possible key-value pair which can be passed from body
    let fieldToUpdate = {
      title: req.body.title,
      subcategory: req.body.subcategory,
      body: req.body.body,
      tags: req.body.tags,
      isPublished: req.body.isPublished,
      category: req.body.category,
    };
    //The keys which are not present in req.body have their value as null and in case of boolean type field it would be false, so those keys are deleted by running the for-loop for all the key-value pairs of our object "fieldToUpdate"
    //Object.entries(fieldToUpdate) would return an array of key-value pairs of the object fieldToUpdate
    for (const [key, value] of Object.entries(fieldToUpdate)) {
      if (!value) delete fieldToUpdate[key];

      // only spaces validation
      if (onlySpaces(`${value}`) == true) {
        return res.status(400).send({
          status: false,
          errro: "Empty Spaces are not accepted in " + `${key}`,
        });
      }
    }
    //now we have only those key-value pair combinations which are passed by the client
    //Because our body and subcategory are an array of string , so we have to push the req.body data into the pre-existing data and similiarly in case of body which is string by type we are concatenating the new data to the pre existing string.
    let blog = await blogModel.findById(blogId);

    //Because tags , subcategory and body data needs to be added in pre-existing data, so they are updated in this manner
    //tags updation
    if ("tags" in fieldToUpdate) {
      if (!blog.tags.includes(req.body.tags)) blog.tags.push(req.body.tags);
      fieldToUpdate.tags = blog.tags;
    }
    //subcategory updation
    if ("subcategory" in fieldToUpdate) {
      if (!blog.subcategory.includes(req.body.subcategory))
        blog.subcategory.push(req.body.subcategory);
      fieldToUpdate.subcategory = blog.subcategory;
    }
    //body updation
    let body = blog.body;
    body += req.body.body;
    if ("body" in fieldToUpdate) {
      fieldToUpdate.body = body;
    }
    //If there is a key named isPublished in req.body so we will add a new key named publishedAt in our document to get the date and time it is published
    if (req.body.isPublished == false) {
      fieldToUpdate.isPublished = "false";
      blog.publishedAt = undefined;
      delete blog.publishedAt;
      await blog.save();
    }
    if (req.body.isPublished == true) {
      fieldToUpdate.isPublished = "true";
      fieldToUpdate.publishedAt = today;
    }

    if (!blog.isDeleted == true) {
      let updatedData = await blogModel.findByIdAndUpdate(
        blogId,
        { $set: { ...fieldToUpdate } },
        { new: true }
      );
      return res.status(200).send({ status: true, data: updatedData });
    }
    //If the blog is already been deleted , it would display the msg message
    else
      res.status(404).send({
        status: false,
        msg: " Blog with this id does not exist", //due to privacy concerns, we are not telling that the blog has been deleted
      });
  } catch (err) {
    res.status(500).send({
      status: false,
      msg: "Internal Server Error",
      error: err.message,
    });
  }
};

//------------------------------------------------------------------------------------------------------------------------------------------------------

const deleteBlog = async function (req, res) {
  try {
    let blogId = req.params.blogId;

    // blogId VALIDATION: done in authorisation

    // "check" OBJECT will contain a key "isDeleted" and its value; of the blog document corresponding to the blogId
    let check = await blogModel.findOne(
      { _id: blogId },
      {
        isDeleted: 1,
        _id: 0,
      }
    );

    //CONDITIONS
    //CASE-1: blogId does not exist: validation already done in authorisation middleware

    //CASE-2: blogId exists but is deleted
    if (check && check.isDeleted) {
      return res.status(404).send({
        status: false,
        msg: "We are sorry; Given blogId does not exist", // Due to privacy concerns we are not telling that the blog is deleted
      });
    }

    //CASE-3: blogId exists but is not deleted
    else if (check && !check.isDeleted) {
      // deletion of blog using findOneAndUpdate
      await blogModel.findOneAndUpdate(
        {
          _id: blogId,
        },
        {
          isDeleted: true,
          deletedAt: new Date(), //deletedAt is added using Date() constructor
        }
      );
      return res.status(200).send({msg: 'Deleted successfully...'});
    }
  } catch (err) {
    res.status(500).send({ msg: "Internal Server Error", error: err.message });
  }
};


//------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  createBlog,
  getBlogs,
  updateBlog,
  deleteBlog,
};
