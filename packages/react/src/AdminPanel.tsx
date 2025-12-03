import './styles.scss';

import AdminPanelBody from './components/AdminPanelBody';
import { AdminAlertProvider } from './context/adminAlerts';
import { ToastProvider } from './context/toasts';
import { ThemeProvider } from './context/themeProvider';

export function AdminPanel() {
    return (
        <div className="admin-panel">
            <ThemeProvider>
                <ToastProvider>
                    <AdminAlertProvider>
                        <AdminPanelBody />
                    </AdminAlertProvider>
                </ToastProvider>
            </ThemeProvider>
        </div>
    );
}
