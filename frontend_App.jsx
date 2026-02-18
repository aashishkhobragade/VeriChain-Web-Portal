import RegisterEventForm from './frontend_RegisterEventForm.jsx';

/**
 * App — root component.
 * Renders the dark-themed dashboard shell with the manufacturer registration form.
 */
export default function App() {
    return (
        <div className="app">
            {/* ── Header ── */}
            <header className="app-header">
                <div className="header-brand">
                    <div className="brand-icon">⬡</div>
                    <div>
                        <div className="brand-name">ChainTrack</div>
                        <div className="brand-sub">Supply Chain Platform</div>
                    </div>
                </div>
                <div className="header-meta">
                    <div className="manufacturer-badge">
                        <span className="status-dot" />
                        MFR-001 · Online
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="app-main">
                <div className="page-container">
                    {/* Page Header */}
                    <div className="page-header">
                        <div className="page-breadcrumb">
                            <span>Dashboard</span>
                            <span className="breadcrumb-sep">›</span>
                            <span>Manufacturing</span>
                            <span className="breadcrumb-sep">›</span>
                            <span className="breadcrumb-current">Register Event</span>
                        </div>
                        <h1 className="page-title">Register New Product Event</h1>
                        <p className="page-subtitle">
                            Log a new manufacturing event using verified product data from the system.
                        </p>
                    </div>

                    {/* Registration Form */}
                    <RegisterEventForm />
                </div>
            </main>
        </div>
    );
}
