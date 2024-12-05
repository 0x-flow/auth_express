import express from "express";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";

const router = express.Router();

// Middleware для обработки JSON
router.use(express.json());

// POST endpoint для логина
router.post("/api/v1/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Проверка наличия необходимых полей
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email и пароль обязательны",
      });
    }

    // Попытка авторизации пользователя
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(userCredential);
    const user = userCredential.user;

    // Получение токена для дальнейшей аутентификации
    const token = await user.getIdToken();

    // Успешный ответ
    return res.status(200).json({
      success: true,
      fullData: user,
      data: {
        uid: user.uid,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    // Обработка ошибок
    let message = "Произошла ошибка при авторизации";
    let statusCode = 500;

    switch (error.code) {
      case "auth/invalid-email":
        message = "Неверный формат email";
        statusCode = 400;
        break;
      case "auth/user-not-found":
      case "auth/wrong-password":
        message = "Неверный email или пароль";
        statusCode = 401;
        break;
      case "auth/too-many-requests":
        message = "Слишком много попыток входа. Попробуйте позже";
        statusCode = 429;
        break;
      case "auth/multi-factor-auth-required":
        message = "Требуется двухфакторная аутентификация";
        statusCode = 403;
        break;
    }

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
});

export default router;
