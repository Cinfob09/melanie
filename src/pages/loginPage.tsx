import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';

const LoginPage: React.FC = () => {
  // Assurez-vous que votre useAuth retourne bien une fonction 'register'
  // Sinon, voir l'étape 3 ci-dessous
  const { user, login, register, loading } = useAuth();

  // Si l'utilisateur est déjà connecté, redirection vers le dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginForm onLogin={login} onRegister={register} loading={loading} />;
};

export default LoginPage;
