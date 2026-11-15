/**
 * Route: `/admin/users` (#89). Every registered user and their details (ADMIN only).
 * Data: GET /api/v1/admin/users. Password hashes are never sent by the backend.
 * #101: a user's name opens their page (/admin/users/:id) with all their orders.
 */
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Users } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { RoleBadge } from "@/components/common/RoleBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { getUsers } from "@/services/authService"

const adminUserKeys = { all: ["admin", "users"] as const }

function UsersPage() {
  const { data: users, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: adminUserKeys.all,
    queryFn: getUsers,
  })

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Users</h1>
        <p className="text-muted-foreground">Everyone who has signed up. Select a name to see that user's orders.</p>
      </div>

      {isPending ? (
        <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We could not load the users" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Accounts appear here after people sign up." />
      ) : (
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{user.user_id}</TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/users/${user.user_id}`}
                      className="font-semibold text-primary hover:underline"
                      aria-label={`${user.full_name}: details and orders`}
                    >
                      {user.full_name}
                    </Link>
                    {/* Phones: the mobile number moves under the name. */}
                    <p className="text-small text-muted-foreground md:hidden">{user.phone}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.phone}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(user.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default UsersPage
