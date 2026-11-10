/**
 * Route: `/admin/users` (#89). Every registered user and their details (ADMIN only).
 * Data: GET /api/v1/admin/users. Password hashes are never sent by the backend.
 */
import { useQuery } from "@tanstack/react-query"
import { Users } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Badge } from "@/components/ui/badge"
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
        <p className="text-muted-foreground">Everyone who has signed up. New accounts are users; admins are created by the team.</p>
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
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{user.user_id}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-small text-muted-foreground">@{user.username}</p>
                    {/* Phones: the email moves under the name. */}
                    <p className="text-small break-all text-muted-foreground md:hidden">{user.email}</p>
                  </TableCell>
                  <TableCell className="hidden break-all md:table-cell">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <Badge className="bg-primary-soft font-semibold text-primary">Admin</Badge>
                    ) : (
                      <Badge className="bg-muted font-semibold text-muted-foreground">User</Badge>
                    )}
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
