-- Create medications database table for reference
CREATE TABLE IF NOT EXISTS public.medications_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name TEXT NOT NULL,
  brand_names TEXT[] DEFAULT '{}',
  form TEXT NOT NULL,
  common_dosages TEXT[] DEFAULT '{}',
  route_of_administration TEXT,
  therapeutic_category TEXT,
  indications TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast searching
CREATE INDEX idx_medications_database_generic_name ON public.medications_database USING gin(to_tsvector('english', generic_name));
CREATE INDEX idx_medications_database_brand_names ON public.medications_database USING gin(brand_names);
CREATE INDEX idx_medications_database_category ON public.medications_database(therapeutic_category);

-- Enable RLS
ALTER TABLE public.medications_database ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can view medications database"
ON public.medications_database
FOR SELECT
TO authenticated
USING (true);

-- Populate with comprehensive medication data
INSERT INTO public.medications_database (generic_name, brand_names, form, common_dosages, route_of_administration, therapeutic_category, indications) VALUES
-- Pain Relief & Anti-inflammatory
('Acetaminophen', ARRAY['Tylenol', 'Panadol'], 'Tablet', ARRAY['325mg', '500mg', '650mg'], 'Oral', 'Analgesic', 'Pain relief, fever reduction'),
('Ibuprofen', ARRAY['Advil', 'Motrin'], 'Tablet', ARRAY['200mg', '400mg', '600mg', '800mg'], 'Oral', 'NSAID', 'Pain relief, inflammation, fever'),
('Naproxen', ARRAY['Aleve', 'Naprosyn'], 'Tablet', ARRAY['220mg', '250mg', '375mg', '500mg'], 'Oral', 'NSAID', 'Pain relief, inflammation'),
('Aspirin', ARRAY['Bayer', 'Ecotrin'], 'Tablet', ARRAY['81mg', '325mg'], 'Oral', 'NSAID', 'Pain relief, cardiovascular protection'),
('Celecoxib', ARRAY['Celebrex'], 'Capsule', ARRAY['100mg', '200mg'], 'Oral', 'NSAID', 'Arthritis, pain'),

-- Antibiotics
('Amoxicillin', ARRAY['Amoxil'], 'Capsule', ARRAY['250mg', '500mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Azithromycin', ARRAY['Zithromax', 'Z-Pak'], 'Tablet', ARRAY['250mg', '500mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Ciprofloxacin', ARRAY['Cipro'], 'Tablet', ARRAY['250mg', '500mg', '750mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Doxycycline', ARRAY['Vibramycin'], 'Capsule', ARRAY['50mg', '100mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Levofloxacin', ARRAY['Levaquin'], 'Tablet', ARRAY['250mg', '500mg', '750mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Cephalexin', ARRAY['Keflex'], 'Capsule', ARRAY['250mg', '500mg'], 'Oral', 'Antibiotic', 'Bacterial infections'),
('Metronidazole', ARRAY['Flagyl'], 'Tablet', ARRAY['250mg', '500mg'], 'Oral', 'Antibiotic', 'Bacterial and parasitic infections'),

-- Blood Pressure & Cardiovascular
('Lisinopril', ARRAY['Prinivil', 'Zestril'], 'Tablet', ARRAY['2.5mg', '5mg', '10mg', '20mg', '40mg'], 'Oral', 'ACE Inhibitor', 'High blood pressure, heart failure'),
('Amlodipine', ARRAY['Norvasc'], 'Tablet', ARRAY['2.5mg', '5mg', '10mg'], 'Oral', 'Calcium Channel Blocker', 'High blood pressure, angina'),
('Losartan', ARRAY['Cozaar'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'ARB', 'High blood pressure'),
('Metoprolol', ARRAY['Lopressor', 'Toprol XL'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'Beta Blocker', 'High blood pressure, angina, heart failure'),
('Atenolol', ARRAY['Tenormin'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'Beta Blocker', 'High blood pressure, angina'),
('Hydrochlorothiazide', ARRAY['Microzide'], 'Tablet', ARRAY['12.5mg', '25mg', '50mg'], 'Oral', 'Diuretic', 'High blood pressure, edema'),
('Furosemide', ARRAY['Lasix'], 'Tablet', ARRAY['20mg', '40mg', '80mg'], 'Oral', 'Diuretic', 'Edema, heart failure'),
('Atorvastatin', ARRAY['Lipitor'], 'Tablet', ARRAY['10mg', '20mg', '40mg', '80mg'], 'Oral', 'Statin', 'High cholesterol'),
('Simvastatin', ARRAY['Zocor'], 'Tablet', ARRAY['5mg', '10mg', '20mg', '40mg', '80mg'], 'Oral', 'Statin', 'High cholesterol'),
('Rosuvastatin', ARRAY['Crestor'], 'Tablet', ARRAY['5mg', '10mg', '20mg', '40mg'], 'Oral', 'Statin', 'High cholesterol'),

-- Diabetes
('Metformin', ARRAY['Glucophage'], 'Tablet', ARRAY['500mg', '850mg', '1000mg'], 'Oral', 'Antidiabetic', 'Type 2 diabetes'),
('Glipizide', ARRAY['Glucotrol'], 'Tablet', ARRAY['5mg', '10mg'], 'Oral', 'Antidiabetic', 'Type 2 diabetes'),
('Insulin Glargine', ARRAY['Lantus', 'Basaglar'], 'Injection', ARRAY['100 units/mL'], 'Subcutaneous', 'Insulin', 'Diabetes'),
('Insulin Lispro', ARRAY['Humalog'], 'Injection', ARRAY['100 units/mL'], 'Subcutaneous', 'Insulin', 'Diabetes'),

-- Thyroid
('Levothyroxine', ARRAY['Synthroid', 'Levoxyl'], 'Tablet', ARRAY['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '150mcg'], 'Oral', 'Thyroid Hormone', 'Hypothyroidism'),

-- Respiratory
('Albuterol', ARRAY['ProAir', 'Ventolin'], 'Inhaler', ARRAY['90mcg'], 'Inhalation', 'Bronchodilator', 'Asthma, COPD'),
('Fluticasone', ARRAY['Flovent'], 'Inhaler', ARRAY['44mcg', '110mcg', '220mcg'], 'Inhalation', 'Corticosteroid', 'Asthma'),
('Montelukast', ARRAY['Singulair'], 'Tablet', ARRAY['4mg', '5mg', '10mg'], 'Oral', 'Leukotriene Inhibitor', 'Asthma, allergies'),

-- Gastrointestinal
('Omeprazole', ARRAY['Prilosec'], 'Capsule', ARRAY['10mg', '20mg', '40mg'], 'Oral', 'Proton Pump Inhibitor', 'GERD, ulcers'),
('Pantoprazole', ARRAY['Protonix'], 'Tablet', ARRAY['20mg', '40mg'], 'Oral', 'Proton Pump Inhibitor', 'GERD, ulcers'),
('Ranitidine', ARRAY['Zantac'], 'Tablet', ARRAY['75mg', '150mg', '300mg'], 'Oral', 'H2 Blocker', 'GERD, ulcers'),
('Ondansetron', ARRAY['Zofran'], 'Tablet', ARRAY['4mg', '8mg'], 'Oral', 'Antiemetic', 'Nausea, vomiting'),

-- Mental Health
('Sertraline', ARRAY['Zoloft'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'SSRI Antidepressant', 'Depression, anxiety'),
('Escitalopram', ARRAY['Lexapro'], 'Tablet', ARRAY['5mg', '10mg', '20mg'], 'Oral', 'SSRI Antidepressant', 'Depression, anxiety'),
('Fluoxetine', ARRAY['Prozac'], 'Capsule', ARRAY['10mg', '20mg', '40mg'], 'Oral', 'SSRI Antidepressant', 'Depression, OCD'),
('Paroxetine', ARRAY['Paxil'], 'Tablet', ARRAY['10mg', '20mg', '30mg', '40mg'], 'Oral', 'SSRI Antidepressant', 'Depression, anxiety'),
('Citalopram', ARRAY['Celexa'], 'Tablet', ARRAY['10mg', '20mg', '40mg'], 'Oral', 'SSRI Antidepressant', 'Depression'),
('Venlafaxine', ARRAY['Effexor'], 'Capsule', ARRAY['37.5mg', '75mg', '150mg'], 'Oral', 'SNRI Antidepressant', 'Depression, anxiety'),
('Duloxetine', ARRAY['Cymbalta'], 'Capsule', ARRAY['20mg', '30mg', '60mg'], 'Oral', 'SNRI Antidepressant', 'Depression, anxiety, neuropathy'),
('Bupropion', ARRAY['Wellbutrin'], 'Tablet', ARRAY['75mg', '100mg', '150mg', '300mg'], 'Oral', 'Antidepressant', 'Depression, smoking cessation'),
('Alprazolam', ARRAY['Xanax'], 'Tablet', ARRAY['0.25mg', '0.5mg', '1mg', '2mg'], 'Oral', 'Benzodiazepine', 'Anxiety, panic disorder'),
('Lorazepam', ARRAY['Ativan'], 'Tablet', ARRAY['0.5mg', '1mg', '2mg'], 'Oral', 'Benzodiazepine', 'Anxiety'),
('Clonazepam', ARRAY['Klonopin'], 'Tablet', ARRAY['0.5mg', '1mg', '2mg'], 'Oral', 'Benzodiazepine', 'Anxiety, seizures'),

-- Sleep
('Zolpidem', ARRAY['Ambien'], 'Tablet', ARRAY['5mg', '10mg'], 'Oral', 'Sedative', 'Insomnia'),
('Trazodone', ARRAY['Desyrel'], 'Tablet', ARRAY['50mg', '100mg', '150mg'], 'Oral', 'Antidepressant/Sedative', 'Insomnia, depression'),
('Melatonin', ARRAY[''], 'Tablet', ARRAY['1mg', '3mg', '5mg', '10mg'], 'Oral', 'Supplement', 'Sleep regulation'),

-- Allergies
('Cetirizine', ARRAY['Zyrtec'], 'Tablet', ARRAY['5mg', '10mg'], 'Oral', 'Antihistamine', 'Allergies'),
('Loratadine', ARRAY['Claritin'], 'Tablet', ARRAY['10mg'], 'Oral', 'Antihistamine', 'Allergies'),
('Fexofenadine', ARRAY['Allegra'], 'Tablet', ARRAY['60mg', '180mg'], 'Oral', 'Antihistamine', 'Allergies'),
('Diphenhydramine', ARRAY['Benadryl'], 'Capsule', ARRAY['25mg', '50mg'], 'Oral', 'Antihistamine', 'Allergies, sleep aid'),

-- Hormone & Contraception
('Levonorgestrel-Ethinyl Estradiol', ARRAY['Levora', 'Seasonale'], 'Tablet', ARRAY['0.15mg/0.03mg'], 'Oral', 'Contraceptive', 'Birth control'),
('Norethindrone', ARRAY['Camila', 'Ortho Micronor'], 'Tablet', ARRAY['0.35mg'], 'Oral', 'Contraceptive', 'Birth control'),

-- Blood Thinners
('Warfarin', ARRAY['Coumadin'], 'Tablet', ARRAY['1mg', '2mg', '2.5mg', '5mg', '7.5mg', '10mg'], 'Oral', 'Anticoagulant', 'Blood clot prevention'),
('Apixaban', ARRAY['Eliquis'], 'Tablet', ARRAY['2.5mg', '5mg'], 'Oral', 'Anticoagulant', 'Blood clot prevention'),
('Rivaroxaban', ARRAY['Xarelto'], 'Tablet', ARRAY['10mg', '15mg', '20mg'], 'Oral', 'Anticoagulant', 'Blood clot prevention'),
('Clopidogrel', ARRAY['Plavix'], 'Tablet', ARRAY['75mg'], 'Oral', 'Antiplatelet', 'Heart attack and stroke prevention'),

-- Seizure/Neurological
('Gabapentin', ARRAY['Neurontin'], 'Capsule', ARRAY['100mg', '300mg', '400mg'], 'Oral', 'Anticonvulsant', 'Seizures, neuropathic pain'),
('Pregabalin', ARRAY['Lyrica'], 'Capsule', ARRAY['25mg', '50mg', '75mg', '100mg', '150mg', '200mg'], 'Oral', 'Anticonvulsant', 'Neuropathic pain, fibromyalgia'),
('Lamotrigine', ARRAY['Lamictal'], 'Tablet', ARRAY['25mg', '50mg', '100mg', '150mg', '200mg'], 'Oral', 'Anticonvulsant', 'Seizures, bipolar disorder'),

-- Gout
('Allopurinol', ARRAY['Zyloprim'], 'Tablet', ARRAY['100mg', '300mg'], 'Oral', 'Xanthine Oxidase Inhibitor', 'Gout prevention'),
('Colchicine', ARRAY['Colcrys'], 'Tablet', ARRAY['0.6mg'], 'Oral', 'Anti-inflammatory', 'Gout'),

-- Osteoporosis
('Alendronate', ARRAY['Fosamax'], 'Tablet', ARRAY['5mg', '10mg', '35mg', '70mg'], 'Oral', 'Bisphosphonate', 'Osteoporosis'),

-- Muscle Relaxants
('Cyclobenzaprine', ARRAY['Flexeril'], 'Tablet', ARRAY['5mg', '10mg'], 'Oral', 'Muscle Relaxant', 'Muscle spasms'),
('Methocarbamol', ARRAY['Robaxin'], 'Tablet', ARRAY['500mg', '750mg'], 'Oral', 'Muscle Relaxant', 'Muscle spasms'),

-- Opioids
('Tramadol', ARRAY['Ultram'], 'Tablet', ARRAY['50mg', '100mg'], 'Oral', 'Opioid Analgesic', 'Moderate to severe pain'),
('Hydrocodone-Acetaminophen', ARRAY['Vicodin', 'Norco'], 'Tablet', ARRAY['5mg/325mg', '7.5mg/325mg', '10mg/325mg'], 'Oral', 'Opioid Analgesic', 'Moderate to severe pain'),
('Oxycodone', ARRAY['OxyContin'], 'Tablet', ARRAY['5mg', '10mg', '15mg', '20mg', '30mg'], 'Oral', 'Opioid Analgesic', 'Moderate to severe pain'),

-- Vitamins & Supplements
('Vitamin D3', ARRAY['Cholecalciferol'], 'Capsule', ARRAY['1000IU', '2000IU', '5000IU'], 'Oral', 'Vitamin', 'Vitamin D deficiency'),
('Vitamin B12', ARRAY['Cyanocobalamin'], 'Tablet', ARRAY['500mcg', '1000mcg'], 'Oral', 'Vitamin', 'Vitamin B12 deficiency'),
('Folic Acid', ARRAY[''], 'Tablet', ARRAY['400mcg', '800mcg', '1mg'], 'Oral', 'Vitamin', 'Folate deficiency, pregnancy'),
('Iron Sulfate', ARRAY['Feosol'], 'Tablet', ARRAY['325mg'], 'Oral', 'Mineral', 'Iron deficiency anemia'),
('Calcium Carbonate', ARRAY['Tums'], 'Tablet', ARRAY['500mg', '600mg'], 'Oral', 'Mineral', 'Calcium supplementation'),

-- Eye Drops
('Latanoprost', ARRAY['Xalatan'], 'Eye Drop', ARRAY['0.005%'], 'Ophthalmic', 'Prostaglandin Analog', 'Glaucoma'),
('Timolol', ARRAY['Timoptic'], 'Eye Drop', ARRAY['0.25%', '0.5%'], 'Ophthalmic', 'Beta Blocker', 'Glaucoma'),

-- Topical
('Hydrocortisone', ARRAY['Cortaid'], 'Cream', ARRAY['0.5%', '1%'], 'Topical', 'Corticosteroid', 'Skin inflammation, itching'),
('Triamcinolone', ARRAY['Kenalog'], 'Cream', ARRAY['0.025%', '0.1%'], 'Topical', 'Corticosteroid', 'Skin inflammation'),
('Mupirocin', ARRAY['Bactroban'], 'Ointment', ARRAY['2%'], 'Topical', 'Antibiotic', 'Skin infections'),

-- Additional Common Medications
('Prednisone', ARRAY['Deltasone'], 'Tablet', ARRAY['2.5mg', '5mg', '10mg', '20mg', '50mg'], 'Oral', 'Corticosteroid', 'Inflammation, autoimmune conditions'),
('Methylprednisolone', ARRAY['Medrol'], 'Tablet', ARRAY['4mg', '8mg', '16mg', '32mg'], 'Oral', 'Corticosteroid', 'Inflammation'),
('Dexamethasone', ARRAY['Decadron'], 'Tablet', ARRAY['0.5mg', '0.75mg', '1mg', '1.5mg', '4mg'], 'Oral', 'Corticosteroid', 'Inflammation, allergic reactions'),
('Spironolactone', ARRAY['Aldactone'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'Diuretic', 'Heart failure, hypertension'),
('Tamsulosin', ARRAY['Flomax'], 'Capsule', ARRAY['0.4mg'], 'Oral', 'Alpha Blocker', 'Benign prostatic hyperplasia'),
('Finasteride', ARRAY['Propecia', 'Proscar'], 'Tablet', ARRAY['1mg', '5mg'], 'Oral', '5-Alpha Reductase Inhibitor', 'Hair loss, BPH'),
('Sildenafil', ARRAY['Viagra'], 'Tablet', ARRAY['25mg', '50mg', '100mg'], 'Oral', 'PDE5 Inhibitor', 'Erectile dysfunction'),
('Tadalafil', ARRAY['Cialis'], 'Tablet', ARRAY['2.5mg', '5mg', '10mg', '20mg'], 'Oral', 'PDE5 Inhibitor', 'Erectile dysfunction, BPH');