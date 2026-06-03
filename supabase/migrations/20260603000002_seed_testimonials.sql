-- Enable RLS on testimonials and allow public reads
ALTER TABLE IF EXISTS testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read testimonials" ON testimonials;
CREATE POLICY "Anyone can read testimonials"
  ON testimonials
  FOR SELECT
  USING (true);

-- Seed 3 testimonials only if the table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM testimonials LIMIT 1) THEN
    INSERT INTO testimonials (name, role, business, content, content_en, sort_order, is_active)
    VALUES
      (
        'Valeria Moreno',
        'Dueña',
        'Trattoria Bella, Rosario',
        'Antes mis clientes me preguntaban el precio de todo y yo tenía que ir y venir. Ahora escanean el QR y piden solos. Las fotos del menú son hermosas y el botón de pago directo desde el celular cambió todo. Mis mesas rotan más rápido y las propinas subieron porque la experiencia es otra.',
        'Before, my customers would ask me the price of everything and I had to keep going back and forth. Now they scan the QR and order themselves. The menu photos are beautiful and the direct payment button changed everything. My tables turn over faster and tips went up because the experience is different.',
        1,
        true
      ),
      (
        'Rodrigo Altamirano',
        'Dueño',
        'Parrilla Don Rodrigo, Córdoba',
        'Lo que más me gustó fue poder ver todo desde el celular mientras estoy en casa. Las ventas del día, qué platos vendí más, si hay algún problema en cocina. Antes tenía que estar físicamente en el local. Ahora con MenuLife tengo el restaurante en el bolsillo, literalmente.',
        'What I liked most was being able to see everything from my phone while at home. The day''s sales, which dishes sold most, if there''s any issue in the kitchen. Before I had to be physically at the restaurant. Now with MenuLife I have the restaurant in my pocket, literally.',
        2,
        true
      ),
      (
        'Sebastián Cruz',
        'Dueño',
        'Café del Puerto, Buenos Aires',
        'Mis mozos aprendieron a usar el sistema en una tarde. Lo que me sorprendió es que lo manejan todo desde el celular — toman el pedido, lo mandan a cocina, cobran. Antes tenían comandas en papel que se perdían. Ahora todo está en tiempo real y no se equivocan más en los pedidos.',
        'My waiters learned the system in an afternoon. What surprised me is they manage everything from their phones — take the order, send it to the kitchen, collect payment. Before they had paper tickets that got lost. Now everything is real time and they no longer make order mistakes.',
        3,
        true
      );
  END IF;
END $$;
