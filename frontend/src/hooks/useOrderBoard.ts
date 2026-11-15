/**
 * useOrderBoard (#104): the admin Orders board, one "Load more" page at a time
 * (GET /admin/orders with status / date / boy / q). The first page also carries the
 * status chip counts and the delivery boy counts.
 */
import { useInfiniteQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getAdminOrders } from "@/services/orderService"
import type { AdminOrderQuery } from "@/types/order"

/** Cards per "Load more" (fills 4, 3, 2 and 1 columns evenly). */
export const BOARD_PAGE_SIZE = 24

export function useOrderBoard(query: Omit<AdminOrderQuery, "page" | "page_size">) {
  return useInfiniteQuery({
    queryKey: orderKeys.board(query),
    queryFn: ({ pageParam }) => getAdminOrders({ ...query, page: pageParam, page_size: BOARD_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
    placeholderData: (previous) => previous, // keep the cards while a filter changes
  })
}
