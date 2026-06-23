import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
            <Helmet>
                <title>Page Not Found - Trip Looper</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <div className="text-center max-w-md">
                <p className="text-7xl font-bold text-[#0E2A38]/10 mb-4">404</p>
                <h1 className="text-2xl font-bold text-[#0E2A38] mb-3">Page not found</h1>
                <p className="text-gray-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 bg-[#0E2A38] text-white rounded-xl font-semibold hover:bg-[#0E2A38]/90 transition-colors"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
