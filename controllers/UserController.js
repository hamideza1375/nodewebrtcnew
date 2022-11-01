const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var fs = require('fs');
const appRoot = require("app-root-path");

const nodeCache = require("node-cache");
const myCache = new nodeCache({ stdTTL: 120, checkperiod: 150 })

const captchapng = require("captchapng");
var CAPTCHA_NUM = null;

const { RegisterVerifyCodeSchema, SendPhoneSchema, LoginSchama } = require('../validator/UserSchema');
const UserModel = require('../model/UserModel');


class UserController {

  async register(req, res) {
    const validate = await SendPhoneSchema.validate(req.body)
    if (!validate) return res.status(400).send('err')
    const { phone } = req.body
    let userPhone = await UserModel.findOne({ phone });
    if (userPhone) return res.status(398).json(" شماره از قبل موجود هست")
    const num = Math.floor(Math.random() * 90000 + 10000)
    // myCache.set("code", num)
    // api.Send({
    //   message: `ارسال کد از رستوران 
    //   Code: ${num}`,
    //   sender: "2000500666",
    //   receptor: req.body.phone,
    // },
    //   function (response, status) {
    //     if (!status || !response) return res.status(400).json('err')
    //     console.log('response',response)
    //     res.status(status).json(response)
    //   });

    myCache.set("code", 12345)
    res.status(200).json('response')
  }


  async verifycodeRegister(req, res) {
    await RegisterVerifyCodeSchema.validate(req.body)
    const { fullname, password, phone } = req.body
    let myCode = req.body.code;
    let myCd = myCache.get("code");
    console.log(myCode, myCd);
    if (myCode != myCd) return res.status(400).json("اشتباه")
    const user = await UserModel.create({ fullname, password, phone });
    let userIndex = await UserModel.find();
    if (userIndex.length === 1) {
      userIndex[0].isAdmin = 'chief'
      userIndex[0].save()
    }
    res.status(201).json({ user })
  }


  async login(req, res) {
    let validate = await LoginSchama.validate(req.body)
    if (!validate) return res.status('400').send('err')
    const user = await UserModel.findOne({ phone: req.body.phone });
    if (!user) { console.log('!user'); return res.status(397).json('کاربری با این ایمیل یافت نشد'); }
    const pass = await bcrypt.compare(req.body.password, user.password);
    if (!pass) { console.log('!pass'); return res.status(397).json('کاربری با این پسورد یافت نشد'); }
    const users = {
      isAdmin: user.isAdmin,
      userId: user._id.toString(),
      phone: user.phone,
      fullname: user.fullname,
    }
    const token = await jwt.sign(users, "secret", { expiresIn: req.body.remember });
    const getTok = jwt.decode(token, { complete: true })
    const exp = getTok.payload.exp.toString()

    if (parseInt(req.body.captcha) == CAPTCHA_NUM) {
      res.status(200).header(token).json({ token, exp, userId: user._id.toString() });
    }
    else {
      res.status(399).send('مساوی نیست')
      throw new TypeError('مساوی نیست')
    }
  }


  async captcha(req, res) {
    CAPTCHA_NUM = req.params.id
    var p = new captchapng(80, 30, CAPTCHA_NUM);
    p.color(0, 0, 0, 0);
    p.color(80, 80, 80, 255);
    var img = p.getBase64();
    var imgbase64 = Buffer.from(img, 'base64');
    res.send(imgbase64);
  }


  async resetPassword(req, res) {
    const { password, confirmPassword } = req.body;
    if (password === confirmPassword) {
      const user = await UserModel.findById({ _id: req.params.id });
      if (!user) return res.ststus(400).json("/404")
      user.password = password;
      await user.save();
      res.status(200).json("موفقیت بروزرسانی شد");
    }
  }


  async sendcode(req, res) {
    const user = await UserModel.findOne({ phone: req.body.phone });
    if (!user) return res.status(400).send('شما قبلا ثبت نام نکردین')
    const num = Math.floor(Math.random() * 90000 + 10000)
    myCache.set("phone", req.body.phone)
    // myCache.set("code", num)
    // api.Send({
    //   message: `ارسال کد از رستوران 
    //   Code: ${num}`,
    //   sender: "2000500666",
    //   receptor: req.body.phone,
    // },
    //   function (response, status) {
    //     if (!status || !response) return res.status(400).json('err')
    //     console.log('response',response)
    //     res.status(status).json(response)
    //   });
    // console.log(11, req.body.phone)

    myCache.set("code", 12345)
    res.status(200).json('response')
  }


  async verifycode(req, res) {
    let phone = myCache.get("phone");
    const user = await UserModel.findOne({ phone })
    let myCode = req.body.code;
    let myCd = myCache.get("code");
    console.log(myCode, myCd);
    if (myCode != myCd) res.status(400).json("اشتباه")
    else res.status(200).json(user._id)
  }




  async imagechat(req, res) {
    try {
      const image = req.files.uri;
      if (!image) return res.status(400).send(err)
      const fileName = req.body.imageName
      fs.writeFileSync(`${appRoot}/public/upload/${fileName}`, image.data);
      res.status(200).json(fileName)
    } catch (err) {
      console.log(err);
    }
  }



  async videoChat(req, res) {
    try {
      const video = req.files.uri;
      console.log('v',video)
      if (!video) return res.status(400).send(err)
      const fileName = req.body.videoName
      fs.writeFileSync(`${appRoot}/public/upload/${fileName}`, video.data);
      res.status(200).json(fileName)
    } catch (err) {
      console.log(err);
    }
  }




}


module.exports = new UserController();
