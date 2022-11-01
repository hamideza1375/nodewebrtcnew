const router = require('express').Router();
const User = require('../controllers/UserController');
const Auth = require('../middleware/Auth');

router.post('/register', User.register);
router.post("/verifycodeRegister", User.verifycodeRegister);
router.post('/login', User.login);
router.post('/resetpassword/:id', User.resetPassword);
router.get("/captcha.png/:id", User.captcha);
router.post('/sendcode', User.sendcode);
router.post("/verifycode", User.verifycode);
router.post("/imagechat", User.imagechat);
router.post("/videoChat", User.videoChat);

module.exports = router;
