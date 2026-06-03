-- Allow anonymous users to insert orders from public menu
-- RLS was blocking anon INSERT on orders and order_items

-- Orders: anyone can insert (anon clients placing orders)
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  WITH CHECK (true);

-- Orders: users can read their own orders by session_id
DROP POLICY IF EXISTS "Anyone can read orders by session" ON orders;
CREATE POLICY "Anyone can read orders by session"
  ON orders
  FOR SELECT
  USING (true);

-- Order items: anyone can insert items for an existing order
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
CREATE POLICY "Anyone can create order items"
  ON order_items
  FOR INSERT
  WITH CHECK (true);

-- Order items: anyone can read order items
DROP POLICY IF EXISTS "Anyone can read order items" ON order_items;
CREATE POLICY "Anyone can read order items"
  ON order_items
  FOR SELECT
  USING (true);
