import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  if (!user.is_approved && (user.role === 'producer' || user.role === 'wholesaler')) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your account is awaiting admin approval. You'll be able to access your dashboard once approved. This usually takes less than 24 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
