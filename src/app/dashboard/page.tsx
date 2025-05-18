'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.success && data.user) {
          setUser(data.user);
        } else {
          // Rediriger vers la page de connexion si non connecté
          router.push('/login');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Déconnexion
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bienvenue dans XO Provisioning</h2>
        <p className="text-gray-600 mb-6">
          Cette application vous permet de gérer les processus de provisionnement pour votre infrastructure.
        </p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-50 overflow-hidden border border-gray-200 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Workflows</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gérez vos processus automatisés et suivez leur exécution.
              </p>
            </div>
            <div className="bg-gray-100 px-4 py-3 sm:px-6">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                Voir tous les workflows →
              </a>
            </div>
          </div>
          
          <div className="bg-gray-50 overflow-hidden border border-gray-200 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Exécutions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Consultez l'historique des exécutions de workflows.
              </p>
            </div>
            <div className="bg-gray-100 px-4 py-3 sm:px-6">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                Voir toutes les exécutions →
              </a>
            </div>
          </div>
          
          <div className="bg-gray-50 overflow-hidden border border-gray-200 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Paramètres</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configurez les préférences de votre compte.
              </p>
            </div>
            <div className="bg-gray-100 px-4 py-3 sm:px-6">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                Modifier les paramètres →
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
