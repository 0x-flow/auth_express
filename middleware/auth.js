import { getAuth } from "firebase-admin/auth";

// Middleware для верификации токена
const verifyToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) {
    return res.status(403).json({
      success: false,
      message: "Токен не предоставлен",
    });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Недействительный токен",
    });
  }
};

export default verifyToken;
