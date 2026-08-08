-- DDL + seed for economy_dev.mospi_cpi_weights — CPI basket weights.
-- Run after init-economy-dev.sql which creates the schema itself.
-- Usage: docker cp this file into the container, then
--   docker exec infra-timescale-1 psql -U admin -d npci -f /tmp/init-economy-dev-mospi-cpi-weights.sql
--
-- Reference data, hand-keyed (it is NOT in the MoSPI API): each category's
-- share of household consumption expenditure, the weights that turn item
-- indices into the headline CPI. Source: MoSPI CPI-2024 press material and
-- FAQ (Annexure V), transcribed in the CPI methodology note (internal ops
-- docs), §2 ("Weights: the complete official tables") and §4 ("Item weights
-- we have"). MoSPI publishes BOTH weight vintages recast into BOTH
-- classification structures; comparing across structures is the food-share
-- trap (FAQ 40) — always compare within one `structure`.
--
--   structure  'cpi2012'    the old 6-group classification
--              'coicop2018' the new 12-division classification (CPI 2024)
--   series     weight vintage: 2012 (HCES 2011-12) or 2024 (HCES 2023-24)
--   sector     rural | urban | combined
--   level      'group' (cpi2012) | 'division' (coicop2018) | 'item'
--   weight     share of spending, per 100; NULL = not measured
--              (rural housing did not exist in CPI 2012)
--
-- Sanity: every (structure, series, sector) slice at group/division level
-- sums to ~100 (±0.005 rounding).

CREATE TABLE IF NOT EXISTS economy_dev.mospi_cpi_weights (
    structure text    NOT NULL,
    series    smallint NOT NULL,
    sector    text    NOT NULL,
    level     text    NOT NULL,
    category  text    NOT NULL,
    weight    numeric,
    PRIMARY KEY (structure, series, sector, level, category)
);

INSERT INTO economy_dev.mospi_cpi_weights (structure, series, sector, level, category, weight) VALUES
-- old 6-group structure, both vintages
('cpi2012', 2012, 'rural',    'group', 'Food and Beverages',          54.180),
('cpi2012', 2024, 'rural',    'group', 'Food and Beverages',          44.801),
('cpi2012', 2012, 'urban',    'group', 'Food and Beverages',          36.287),
('cpi2012', 2024, 'urban',    'group', 'Food and Beverages',          34.264),
('cpi2012', 2012, 'combined', 'group', 'Food and Beverages',          45.863),
('cpi2012', 2024, 'combined', 'group', 'Food and Beverages',          40.104),
('cpi2012', 2012, 'rural',    'group', 'Pan, Tobacco and Intoxicants', 3.263),
('cpi2012', 2024, 'rural',    'group', 'Pan, Tobacco and Intoxicants', 3.733),
('cpi2012', 2012, 'urban',    'group', 'Pan, Tobacco and Intoxicants', 1.363),
('cpi2012', 2024, 'urban',    'group', 'Pan, Tobacco and Intoxicants', 2.065),
('cpi2012', 2012, 'combined', 'group', 'Pan, Tobacco and Intoxicants', 2.380),
('cpi2012', 2024, 'combined', 'group', 'Pan, Tobacco and Intoxicants', 2.989),
('cpi2012', 2012, 'rural',    'group', 'Clothing and Footwear',        7.357),
('cpi2012', 2024, 'rural',    'group', 'Clothing and Footwear',        7.123),
('cpi2012', 2012, 'urban',    'group', 'Clothing and Footwear',        5.571),
('cpi2012', 2024, 'urban',    'group', 'Clothing and Footwear',        5.464),
('cpi2012', 2012, 'combined', 'group', 'Clothing and Footwear',        6.527),
('cpi2012', 2024, 'combined', 'group', 'Clothing and Footwear',        6.383),
('cpi2012', 2012, 'rural',    'group', 'Housing',                      NULL),
('cpi2012', 2024, 'rural',    'group', 'Housing',                      5.527),
('cpi2012', 2012, 'urban',    'group', 'Housing',                     21.664),
('cpi2012', 2024, 'urban',    'group', 'Housing',                     19.778),
('cpi2012', 2012, 'combined', 'group', 'Housing',                     10.070),
('cpi2012', 2024, 'combined', 'group', 'Housing',                     11.881),
('cpi2012', 2012, 'rural',    'group', 'Fuel and Light',               7.940),
('cpi2012', 2024, 'rural',    'group', 'Fuel and Light',               5.957),
('cpi2012', 2012, 'urban',    'group', 'Fuel and Light',               5.580),
('cpi2012', 2024, 'urban',    'group', 'Fuel and Light',               4.907),
('cpi2012', 2012, 'combined', 'group', 'Fuel and Light',               6.843),
('cpi2012', 2024, 'combined', 'group', 'Fuel and Light',               5.489),
('cpi2012', 2012, 'rural',    'group', 'Miscellaneous',               27.260),
('cpi2012', 2024, 'rural',    'group', 'Miscellaneous',               32.858),
('cpi2012', 2012, 'urban',    'group', 'Miscellaneous',               29.535),
('cpi2012', 2024, 'urban',    'group', 'Miscellaneous',               33.523),
('cpi2012', 2012, 'combined', 'group', 'Miscellaneous',               28.317),
('cpi2012', 2024, 'combined', 'group', 'Miscellaneous',               33.154),
-- new 12-division structure (COICOP 2018), both vintages
('coicop2018', 2012, 'rural',    'division', 'Food and beverages',    50.922),
('coicop2018', 2024, 'rural',    'division', 'Food and beverages',    41.983),
('coicop2018', 2012, 'urban',    'division', 'Food and beverages',    32.811),
('coicop2018', 2024, 'urban',    'division', 'Food and beverages',    30.251),
('coicop2018', 2012, 'combined', 'division', 'Food and beverages',    42.617),
('coicop2018', 2024, 'combined', 'division', 'Food and beverages',    36.753),
('coicop2018', 2012, 'rural',    'division', 'Paan, tobacco and intoxicants', 3.263),
('coicop2018', 2024, 'rural',    'division', 'Paan, tobacco and intoxicants', 3.733),
('coicop2018', 2012, 'urban',    'division', 'Paan, tobacco and intoxicants', 1.363),
('coicop2018', 2024, 'urban',    'division', 'Paan, tobacco and intoxicants', 2.065),
('coicop2018', 2012, 'combined', 'division', 'Paan, tobacco and intoxicants', 2.380),
('coicop2018', 2024, 'combined', 'division', 'Paan, tobacco and intoxicants', 2.989),
('coicop2018', 2012, 'rural',    'division', 'Clothing and footwear',  7.357),
('coicop2018', 2024, 'rural',    'division', 'Clothing and footwear',  7.123),
('coicop2018', 2012, 'urban',    'division', 'Clothing and footwear',  5.571),
('coicop2018', 2024, 'urban',    'division', 'Clothing and footwear',  5.464),
('coicop2018', 2012, 'combined', 'division', 'Clothing and footwear',  6.527),
('coicop2018', 2024, 'combined', 'division', 'Clothing and footwear',  6.383),
('coicop2018', 2012, 'rural',    'division', 'Housing, water, electricity, gas and other fuels',  7.983),
('coicop2018', 2024, 'rural',    'division', 'Housing, water, electricity, gas and other fuels', 11.764),
('coicop2018', 2012, 'urban',    'division', 'Housing, water, electricity, gas and other fuels', 27.294),
('coicop2018', 2024, 'urban',    'division', 'Housing, water, electricity, gas and other fuels', 25.000),
('coicop2018', 2012, 'combined', 'division', 'Housing, water, electricity, gas and other fuels', 16.888),
('coicop2018', 2024, 'combined', 'division', 'Housing, water, electricity, gas and other fuels', 17.665),
('coicop2018', 2012, 'rural',    'division', 'Furnishings, household equipment and routine household maintenance', 3.632),
('coicop2018', 2024, 'rural',    'division', 'Furnishings, household equipment and routine household maintenance', 4.609),
('coicop2018', 2012, 'urban',    'division', 'Furnishings, household equipment and routine household maintenance', 3.701),
('coicop2018', 2024, 'urban',    'division', 'Furnishings, household equipment and routine household maintenance', 4.296),
('coicop2018', 2012, 'combined', 'division', 'Furnishings, household equipment and routine household maintenance', 3.656),
('coicop2018', 2024, 'combined', 'division', 'Furnishings, household equipment and routine household maintenance', 4.469),
('coicop2018', 2012, 'rural',    'division', 'Health', 6.839),
('coicop2018', 2024, 'rural',    'division', 'Health', 6.764),
('coicop2018', 2012, 'urban',    'division', 'Health', 4.820),
('coicop2018', 2024, 'urban',    'division', 'Health', 5.275),
('coicop2018', 2012, 'combined', 'division', 'Health', 5.900),
('coicop2018', 2024, 'combined', 'division', 'Health', 6.100),
('coicop2018', 2012, 'rural',    'division', 'Transport', 5.645),
('coicop2018', 2024, 'rural',    'division', 'Transport', 8.644),
('coicop2018', 2012, 'urban',    'division', 'Transport', 7.129),
('coicop2018', 2024, 'urban',    'division', 'Transport', 8.985),
('coicop2018', 2012, 'combined', 'division', 'Transport', 6.394),
('coicop2018', 2024, 'combined', 'division', 'Transport', 8.796),
('coicop2018', 2012, 'rural',    'division', 'Information and communication', 2.818),
('coicop2018', 2024, 'rural',    'division', 'Information and communication', 3.647),
('coicop2018', 2012, 'urban',    'division', 'Information and communication', 3.906),
('coicop2018', 2024, 'urban',    'division', 'Information and communication', 3.563),
('coicop2018', 2012, 'combined', 'division', 'Information and communication', 3.323),
('coicop2018', 2024, 'combined', 'division', 'Information and communication', 3.609),
('coicop2018', 2012, 'rural',    'division', 'Recreation, sport and culture', 1.463),
('coicop2018', 2024, 'rural',    'division', 'Recreation, sport and culture', 1.359),
('coicop2018', 2012, 'urban',    'division', 'Recreation, sport and culture', 1.634),
('coicop2018', 2024, 'urban',    'division', 'Recreation, sport and culture', 1.710),
('coicop2018', 2012, 'combined', 'division', 'Recreation, sport and culture', 1.547),
('coicop2018', 2024, 'combined', 'division', 'Recreation, sport and culture', 1.516),
('coicop2018', 2012, 'rural',    'division', 'Education services', 2.468),
('coicop2018', 2024, 'rural',    'division', 'Education services', 2.383),
('coicop2018', 2012, 'urban',    'division', 'Education services', 4.720),
('coicop2018', 2024, 'urban',    'division', 'Education services', 4.515),
('coicop2018', 2012, 'combined', 'division', 'Education services', 3.513),
('coicop2018', 2024, 'combined', 'division', 'Education services', 3.333),
('coicop2018', 2012, 'rural',    'division', 'Restaurants and accommodation services', 3.248),
('coicop2018', 2024, 'rural',    'division', 'Restaurants and accommodation services', 2.841),
('coicop2018', 2012, 'urban',    'division', 'Restaurants and accommodation services', 3.489),
('coicop2018', 2024, 'urban',    'division', 'Restaurants and accommodation services', 3.978),
('coicop2018', 2012, 'combined', 'division', 'Restaurants and accommodation services', 3.246),
('coicop2018', 2024, 'combined', 'division', 'Restaurants and accommodation services', 3.348),
('coicop2018', 2012, 'rural',    'division', 'Personal care, social protection and miscellaneous goods and services', 4.362),
('coicop2018', 2024, 'rural',    'division', 'Personal care, social protection and miscellaneous goods and services', 5.150),
('coicop2018', 2012, 'urban',    'division', 'Personal care, social protection and miscellaneous goods and services', 3.566),
('coicop2018', 2024, 'urban',    'division', 'Personal care, social protection and miscellaneous goods and services', 4.899),
('coicop2018', 2012, 'combined', 'division', 'Personal care, social protection and miscellaneous goods and services', 4.006),
('coicop2018', 2024, 'combined', 'division', 'Personal care, social protection and miscellaneous goods and services', 5.038),
-- item-level weights disclosed in CPI-2024 press material (combined sector)
('coicop2018', 2024, 'combined', 'item', 'Potato',                            0.7549),
('coicop2018', 2024, 'combined', 'item', 'Onion',                             0.7006),
('coicop2018', 2024, 'combined', 'item', 'Arhar/Tur',                         0.5333),
('coicop2018', 2024, 'combined', 'item', 'Tomato',                            0.4961),
('coicop2018', 2024, 'combined', 'item', 'Garlic',                            0.3738),
('coicop2018', 2024, 'combined', 'item', 'Ginger',                            0.2556),
('coicop2018', 2024, 'combined', 'item', 'Peas',                              0.1254),
('coicop2018', 2024, 'combined', 'item', 'Coconut oil',                       0.0579),
('coicop2018', 2024, 'combined', 'item', 'Motor cycle and scooter',           0.6581),
('coicop2018', 2024, 'combined', 'item', 'Gold/diamond/platinum jewellery',   0.6230),
('coicop2018', 2024, 'combined', 'item', 'Motor car and jeep',                0.4665),
('coicop2018', 2024, 'combined', 'item', 'Cumin (jeera)',                     0.3655),
('coicop2018', 2024, 'combined', 'item', 'Silver jewellery',                  0.3127),
('coicop2018', 2024, 'combined', 'item', 'Raisin and monacca',                0.1639),
('coicop2018', 2024, 'combined', 'item', 'Coconut: copra',                    0.0854)
ON CONFLICT (structure, series, sector, level, category)
DO UPDATE SET weight = EXCLUDED.weight;
