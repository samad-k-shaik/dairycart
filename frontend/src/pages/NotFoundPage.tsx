/**
 * NotFoundPage – shown for any URL that matches no route (#23), e.g. /hello.
 * The router's catch-all path "*" points here.
 */
import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Button asChild>
          <Link to="/">Go to home</Link>
        </Button>
      }
      className="my-10"
    />
  )
}
