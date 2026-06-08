import { useAuth } from '@/auth/useAuth';
import { useProfileQuery } from '@/lib/queries';

export function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfileQuery();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {profile && (
        <div className="rounded-md border p-4 space-y-2 text-sm">
          <div><span className="font-medium">Name:</span> {profile.name}</div>
          <div><span className="font-medium">Email:</span> {profile.email}</div>
          <div><span className="font-medium">Sub:</span> <code>{profile.sub}</code></div>
          <div><span className="font-medium">Groups:</span> {profile.groups.join(', ') || 'none'}</div>
        </div>
      )}

      {user && (
        <details className="rounded-md border p-4 text-xs">
          <summary className="cursor-pointer font-medium">Raw OIDC claims</summary>
          <pre className="mt-2 overflow-auto">{JSON.stringify(user.profile, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
