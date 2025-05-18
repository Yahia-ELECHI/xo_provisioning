'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useCurrentUser from '@/hooks/useCurrentUser';
// @ts-ignore - Pour éviter l'erreur de déclaration de type
import { 
  HiOutlineChartBar, 
  HiOutlineServer,
  HiOutlineCog, 
  HiOutlineUserGroup,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
  HiOutlineLogout,
  HiOutlineCollection
} from 'react-icons/hi';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

// Interface pour le modal d'édition utilisateur
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  userId: string | null;
}

// Importation dynamique du modal d'édition
let EditUserModal: React.ComponentType<EditUserModalProps> | null = null;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [EditUserModalComponent, setEditUserModalComponent] = useState<React.ComponentType<EditUserModalProps> | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  const menuItems: MenuItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: <HiOutlineChartBar className="w-6 h-6" /> 
    },
    { 
      name: 'Provisioning', 
      href: '/provisioning', 
      icon: <HiOutlineServer className="w-6 h-6" /> 
    },
    { 
      name: 'Workflows', 
      href: '/workflows', 
      icon: <HiOutlineCollection className="w-6 h-6" /> 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: <HiOutlineCog className="w-6 h-6" /> 
    },
    { 
      name: 'Accounts', 
      href: '/accounts', 
      icon: <HiOutlineUserGroup className="w-6 h-6" /> 
    },
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };
  
  // Chargement dynamique du composant EditUserModal
  useEffect(() => {
    import('@/components/accounts/EditUserModal').then((module) => {
      setEditUserModalComponent(() => module.default);
    }).catch(error => {
      console.error('Erreur lors du chargement du modal d\'édition:', error);
    });
  }, []);

  // Ouvrir le modal des préférences utilisateur au lieu de naviguer vers la page settings
  const navigateToSettings = () => {
    if (user) {
      setShowPreferencesModal(true);
    }
  };
  
  const closePreferencesModal = () => {
    setShowPreferencesModal(false);
  };

  return (
    <>
      <aside 
        className={`bg-gray-800 text-white transition-all duration-300 ease-in-out h-screen flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
      <div className="p-4 flex items-center justify-between border-b border-gray-700">
        <div className={`${collapsed ? 'hidden' : 'block'}`}>
          <h1 className="text-xl font-bold">XO Provisioning</h1>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-700 focus:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <HiOutlineChevronRight className="w-5 h-5" />
          ) : (
            <HiOutlineChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center p-3 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-600' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <span className="text-gray-300">{item.icon}</span>
                  {!collapsed && (
                    <span className="ml-3">{item.name}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="border-t border-gray-700 mt-auto">
        {/* Menu utilisateur avec options déroulantes */}
        <div className="relative">
          <button 
            onClick={toggleMenu}
            className={`w-full p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} hover:bg-gray-700 transition-colors`}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {!loading && user ? user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              {!collapsed && (
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium">
                    {!loading && user ? user.name || user.email.split('@')[0] : 'Chargement...'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {!loading && user ? user.email : ''}
                  </p>
                </div>
              )}
            </div>
            
            {!collapsed && (
              <HiOutlineChevronUp 
                className={`w-5 h-5 text-gray-400 transition-transform ${menuOpen ? '' : 'transform rotate-180'}`} 
              />
            )}
          </button>
          
          {/* Menu déroulant */}
          {menuOpen && !collapsed && (
            <div className="absolute bottom-full left-0 w-full bg-gray-700 rounded-t-md shadow-lg overflow-hidden">
              <button 
                onClick={navigateToSettings}
                className="w-full flex items-center px-4 py-3 text-left text-sm hover:bg-gray-600 transition-colors"
              >
                <HiOutlineCog className="w-5 h-5 mr-3 text-gray-400" />
                <span>Préférences</span>
              </button>
              
              <hr className="border-gray-600" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-left text-sm text-red-300 hover:bg-gray-600 transition-colors"
              >
                <HiOutlineLogout className="w-5 h-5 mr-3" />
                <span>Déconnexion</span>
              </button>
            </div>
          )}
          
          {/* Menu condensé en mode réduit */}
          {collapsed && (
            <div className="pt-2 pb-4 space-y-2">
              <button 
                onClick={navigateToSettings}
                className="w-full flex justify-center p-2 hover:bg-gray-700 transition-colors"
                title="Préférences"
              >
                <HiOutlineCog className="w-5 h-5 text-gray-400" />
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full flex justify-center p-2 text-red-300 hover:bg-gray-700 transition-colors"
                title="Déconnexion"
              >
                <HiOutlineLogout className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>

    {/* Modal de préférences utilisateur */}
    {showPreferencesModal && EditUserModalComponent && user && (
      <EditUserModalComponent
        isOpen={showPreferencesModal}
        onClose={closePreferencesModal}
        onUserUpdated={() => {
          // Actualiser les données après mise à jour
          closePreferencesModal();
        }}
        userId={user.id}
      />
    )}
    </>
  );
}
