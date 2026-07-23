import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { NavigationShell } from './components/NavigationShell';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavigationShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
