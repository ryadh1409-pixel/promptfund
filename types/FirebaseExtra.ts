export type FirebaseExtraConfig = {
  env: 'development' | 'staging' | 'production';
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};
