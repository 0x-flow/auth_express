import { initializeApp } from "firebase/app";
import { getAuth as getFirebaseAuth } from "firebase/auth";
import { initializeApp as initializeAdminApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
import { readFileSync } from "fs";

const NUM_ADJ_INTERVALS = 5;

// Загружаем переменные окружения перед использованием
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
};

// Проверяем, что все необходимые переменные окружения определены
const requiredEnvVars = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_CONFIG",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Загружаем учетные данные для Firebase Admin SDK
const serviceAccount = JSON.parse(readFileSync("./serviceAccountkey.json"));

// Инициализация Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getFirebaseAuth(firebaseApp);

initializeAdminApp({
  credential: cert(serviceAccount),
  databaseURL:
    "https://xflow-dev-d2813-default-rtdb.europe-west1.firebasedatabase.app",
});

getAdminAuth()
  .projectConfigManager()
  .updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [
        {
          state: "ENABLED",
          totpProviderConfig: {
            adjacentIntervals: NUM_ADJ_INTERVALS,
          },
        },
      ],
    },
  });

export { firebaseApp, auth };
