import express from 'express';
import { 
    multiFactor,
    TotpMultiFactorGenerator,

} from "firebase/auth";

import verifyToken from '../middleware/auth.js';
import { auth } from '../config/firebase.js';

const router = express.Router();

// Middleware для обработки JSON
router.use(express.json());

// router.use(verifyToken);

// POST endpoint для генерации TOTP секрета
router.post('/api/v1/totp/generate', async (req, res) => {
    try {


        const user = auth.currentUser;


        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        // Генерируем сессию и секрет для TOTP
        const multiFactorSession = await multiFactor(user).getSession();
        const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);

        // Генерируем URL для QR кода
        const qrCodeUrl = totpSecret.generateQrCodeUrl(
            user.email, // используем email как идентификатор аккаунта
            'x-Flow' // название вашего приложения
        );

        // Сохраняем временно секрет в сессии или другом безопасном месте
        // В реальном приложении лучше использовать Redis или другое защищенное хранилище
        // req.session.totpSecret = totpSecret;

        return res.status(200).json({
            success: true,
            data: {
                qrCodeUrl,
                secretKey: totpSecret.secretKey // можно показать как резервный код
            }
        });

    } catch (error) {
        console.error('TOTP Generation Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ошибка при генерации TOTP'
        });
    }
});

// POST endpoint для верификации и активации TOTP
router.post('/api/v1/totp/verify', async (req, res) => {
    try {
        const { verificationCode, mfaDisplayName, uid } = req.body;

        if (!verificationCode || !mfaDisplayName || !uid) {
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны'
            });
        }

        const user = auth.currentUser;
        if (!user || user.uid !== uid) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }

        // Получаем сохраненный секрет
        const totpSecret = req.session.totpSecret;
        if (!totpSecret) {
            return res.status(400).json({
                success: false,
                message: 'TOTP секрет не найден. Сначала сгенерируйте QR код'
            });
        }

        // Создаем утверждение для регистрации
        const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
            totpSecret,
            verificationCode
        );

        // Завершаем регистрацию TOTP
        await multiFactor(user).enroll(multiFactorAssertion, mfaDisplayName);

        // Очищаем временный секрет
        delete req.session.totpSecret;

        return res.status(200).json({
            success: true,
            message: 'TOTP успешно настроен'
        });

    } catch (error) {
        console.error('TOTP Verification Error:', error);
        let message = 'Ошибка при верификации TOTP';
        let statusCode = 500;

        switch (error.code) {
            case 'auth/invalid-verification-code':
                message = 'Неверный код верификации';
                statusCode = 400;
                break;
            case 'auth/invalid-multi-factor-session':
                message = 'Недействительная MFA сессия';
                statusCode = 400;
                break;
        }

        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});

export default router;