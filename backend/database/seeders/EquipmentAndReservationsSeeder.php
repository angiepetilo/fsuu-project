<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\Brand;
use App\Models\Department;
use App\Models\EquipmentBorrow;
use App\Models\EquipmentBorrowItem;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\TrackingNumber;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\VenueBookingEquipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EquipmentAndReservationsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('Starting Equipment and Reservations Seeder...');

        $academicTerm = AcademicTerm::where('is_active', true)->first()
            ?? AcademicTerm::first()
            ?? AcademicTerm::create([
                'name'        => 'First Semester AY 2026-2027',
                'term'        => '1st Semester',
                'school_year' => '2026-2027',
                'is_active'   => true,
                'is_default'  => true,
                'starts_at'   => '2026-08-01',
                'ends_at'     => '2026-12-31',
            ]);

        $adminUser = User::first() ?? User::create([
            'name'          => 'Super Administrator',
            'first_name'    => 'Super',
            'last_name'     => 'Administrator',
            'email_address' => 'superadmin@urios.edu.ph',
            'email'         => 'superadmin@urios.edu.ph',
            'password'      => bcrypt('password123'),
            'is_active'     => true,
            'status'        => 'active',
            'permissions'   => ['*'],
        ]);

        $departments = Department::all();
        if ($departments->isEmpty()) {
            $this->call(DepartmentSeeder::class);
            $departments = Department::all();
        }

        // =========================================================================
        // 1. Ensure Venues Exist (AVR 1, AVR 2, Auditorium, Mini Theater, Conf Hall)
        // =========================================================================
        $venueDefs = [
            ['name' => 'Audio-visual Room # 1', 'capacity' => 150, 'min_capacity' => 80, 'max_capacity' => 150, 'location' => 'Main Building 3rd Floor'],
            ['name' => 'Audio-visual Room #2', 'capacity' => 110, 'min_capacity' => 60, 'max_capacity' => 110, 'location' => 'Science Wing 2nd Floor'],
            ['name' => 'University Auditorium', 'capacity' => 500, 'min_capacity' => 150, 'max_capacity' => 500, 'location' => 'Gymnasium Complex'],
            ['name' => 'AVR Mini Theater', 'capacity' => 85, 'min_capacity' => 30, 'max_capacity' => 85, 'location' => 'Library Complex 4th Floor'],
            ['name' => 'Executive Conference Hall', 'capacity' => 60, 'min_capacity' => 15, 'max_capacity' => 60, 'location' => 'Administration Building 2nd Floor'],
        ];

        $venueModels = [];
        foreach ($venueDefs as $vd) {
            $v = Venue::firstOrCreate(
                ['name' => $vd['name']],
                [
                    'capacity'     => $vd['capacity'],
                    'min_capacity' => $vd['min_capacity'],
                    'max_capacity' => $vd['max_capacity'],
                    'location'     => $vd['location'],
                    'status'       => 'available',
                ]
            );
            $venueModels[] = $v;
        }

        // =========================================================================
        // 2. Realistic Equipment Categories (EquipmentType) & Associated Brands
        // =========================================================================
        $categoryDefinitions = [
            // Core Display & Projection
            ['name' => 'Standard LCD Projector', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Epson', 'NEC', 'Sony', 'BenQ', 'Optoma']],
            ['name' => 'High-Lumen Laser Projector', 'is_public' => true, 'lifespan' => 6, 'brands' => ['Panasonic', 'Sony', 'Epson', 'ViewSonic']],
            ['name' => 'Short-Throw Projector', 'is_public' => true, 'lifespan' => 5, 'brands' => ['BenQ', 'Epson', 'Optoma', 'Hitachi']],
            ['name' => 'Portable Mini Projector', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Anker', 'ViewSonic', 'ASUS', 'XGIMI']],
            ['name' => 'Tripod Screen 84"', 'is_public' => true, 'lifespan' => 7, 'brands' => ['Da-Lite', 'Elite Screens', 'Draper', 'Apollo']],
            ['name' => 'Motorized Projection Screen 120"', 'is_public' => true, 'lifespan' => 8, 'brands' => ['Elite Screens', 'Da-Lite', 'Grandview']],
            ['name' => 'Fast-Fold Stage Screen 150"', 'is_public' => true, 'lifespan' => 7, 'brands' => ['Da-Lite', 'Draper', 'AV Stumpfl']],

            // Audio & Microphones
            ['name' => 'Wireless Handheld Microphone', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Shure', 'Sennheiser', 'Audio-Technica', 'Samson']],
            ['name' => 'Wireless Lapel / Lavalier Mic', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Rode', 'Sennheiser', 'Shure', 'Hollyland', 'DJI']],
            ['name' => 'Conference Gooseneck Microphone', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Shure', 'Audio-Technica', 'Bosch', 'Beyerdynamic']],
            ['name' => 'Wired Dynamic Microphone', 'is_public' => true, 'lifespan' => 6, 'brands' => ['Shure', 'Audio-Technica', 'Behringer', 'Sennheiser']],
            ['name' => 'Studio Condenser Microphone', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Rode', 'Audio-Technica', 'AKG', 'Blue Yeti']],

            // Sound Systems & Mixers
            ['name' => 'Powered PA Speaker System', 'is_public' => true, 'lifespan' => 6, 'brands' => ['JBL', 'Yamaha', 'Electro-Voice', 'Mackie', 'Bose']],
            ['name' => 'Portable Trolley Speaker with Mic', 'is_public' => true, 'lifespan' => 4, 'brands' => ['JBL', 'Fender', 'Samson', 'Bose']],
            ['name' => 'Stage Floor Monitor', 'is_public' => true, 'lifespan' => 6, 'brands' => ['Yamaha', 'JBL', 'Turbosound', 'Mackie']],
            ['name' => '8-Channel Compact Audio Mixer', 'is_public' => true, 'lifespan' => 6, 'brands' => ['Yamaha', 'Mackie', 'Behringer', 'Soundcraft']],
            ['name' => '16-Channel Digital Audio Mixer', 'is_public' => true, 'lifespan' => 7, 'brands' => ['Behringer', 'Yamaha', 'PreSonus', 'Allen & Heath']],

            // Cameras & Video Production
            ['name' => '4K Professional Camcorder', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Sony', 'Panasonic', 'Canon', 'JVC']],
            ['name' => 'DSLR Video Production Camera', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Canon', 'Sony', 'Nikon', 'Fujifilm']],
            ['name' => 'Professional Camera Tripod', 'is_public' => true, 'lifespan' => 7, 'brands' => ['Manfrotto', 'Benro', 'Sirui', 'Velbon']],
            ['name' => 'High-Definition Document Camera', 'is_public' => true, 'lifespan' => 5, 'brands' => ['AverMedia', 'IPEVO', 'Lumens', 'Elmo']],
            ['name' => 'Studio LED Bi-Color Video Light', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Godox', 'Aputure', 'Neewer', 'Nanlite']],

            // Accessories, Cables & Power
            ['name' => 'Heavy Duty Extension Cord 10m', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Omni', 'Royu', 'Panther', 'Akari']],
            ['name' => 'Heavy Duty Extension Cord 20m', 'is_public' => true, 'lifespan' => 5, 'brands' => ['Omni', 'Panther', 'Royu', 'APC']],
            ['name' => 'HDMI High-Speed Cable 5m', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Philips', 'Ugreen', 'Belkin', 'Baseus']],
            ['name' => 'HDMI High-Speed Cable 10m', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Ugreen', 'Vention', 'Anker', 'Belkin']],
            ['name' => 'VGA with Audio Cable 5m', 'is_public' => false, 'lifespan' => 4, 'brands' => ['Belkin', 'Ugreen', 'Philips']],
            ['name' => 'Wireless Presentation Clicker', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Logitech', 'Baseus', 'Kensington', 'Targus']],
            ['name' => 'HDMI to USB Video Capture Card', 'is_public' => true, 'lifespan' => 4, 'brands' => ['Elgato', 'AverMedia', 'CamLink', 'Ugreen']],
            ['name' => 'Multi-Format HDMI Switcher', 'is_public' => true, 'lifespan' => 5, 'brands' => ['ATEN', 'Blackmagic', 'Roland', 'Kramer']],
        ];

        $categoryModels = [];
        $categoryBrandMap = [];

        foreach ($categoryDefinitions as $def) {
            $cat = EquipmentType::withTrashed()->where('eq_name', $def['name'])
                ->orWhere('name', $def['name'])
                ->first();

            if (!$cat) {
                $cat = EquipmentType::create([
                    'eq_name'           => $def['name'],
                    'name'              => $def['name'],
                    'status'            => 'available',
                    'is_public'         => $def['is_public'],
                    'lifespan_years'    => $def['lifespan'],
                    'date_purchased'    => '2024-01-15',
                    'total_quantity'    => 0,
                    'available_count'   => 0,
                    'built_in_count'    => 0,
                    'unavailable_count' => 0,
                    'reserved_count'    => 0,
                    'damaged_count'     => 0,
                    'lost_count'        => 0,
                    'released_count'    => 0,
                    'built_in_units'    => [],
                ]);
            } else {
                if ($cat->trashed()) {
                    $cat->restore();
                }
            }

            $categoryModels[$cat->id] = $cat;
            $categoryBrandMap[$cat->id] = $def['brands'];

            // Register brands in `brands` table
            foreach ($def['brands'] as $bName) {
                Brand::firstOrCreate(
                    [
                        'name'              => $bName,
                        'equipment_type_id' => $cat->id,
                    ],
                    [
                        'description' => "Genuine {$bName} equipment for {$cat->eq_name}",
                        'status'      => 'active',
                    ]
                );
            }
        }

        // Link built-in accessories: standard projectors get HDMI & Extension cords linked
        $hdmiCat = collect($categoryModels)->first(fn($c) => str_contains(strtolower($c->eq_name), 'hdmi high-speed cable 5m') || strtolower($c->eq_name) === 'hdmi');
        $powerCat = collect($categoryModels)->first(fn($c) => str_contains(strtolower($c->eq_name), 'heavy duty extension cord 10m') || str_contains(strtolower($c->eq_name), 'power cable'));
        $clickerCat = collect($categoryModels)->first(fn($c) => str_contains(strtolower($c->eq_name), 'clicker'));

        foreach ($categoryModels as $cat) {
            if (str_contains(strtolower($cat->eq_name), 'projector') && $hdmiCat) {
                $builtIns = array_filter([$hdmiCat->id, $powerCat?->id, $clickerCat?->id]);
                $cat->update(['built_in_units' => array_values(array_unique($builtIns))]);
            }
        }

        // =========================================================================
        // 3. Generate Exactly 2,000 Physical Equipment Units (EquipmentUnit)
        // =========================================================================
        $currentUnitCount = EquipmentUnit::count();
        $targetTotalUnits = 2000;
        $unitsToCreate = max(0, $targetTotalUnits - $currentUnitCount);

        $this->command?->info("Existing units: {$currentUnitCount}. Creating {$unitsToCreate} new units to reach {$targetTotalUnits} total.");

        if ($unitsToCreate > 0) {
            $catIds = array_keys($categoryModels);
            $catCount = count($catIds);

            // Calculate units per category proportionally
            $baseUnitsPerCat = intdiv($unitsToCreate, $catCount);
            $remainder = $unitsToCreate % $catCount;

            $now = Carbon::now();
            $unitInsertChunks = [];
            $batchIndex = 0;

            // Track existing sequence numbers per category
            $catSeqCounters = [];
            foreach ($catIds as $cid) {
                $maxSeq = EquipmentUnit::where('equipment_type_id', $cid)->count();
                $catSeqCounters[$cid] = $maxSeq;
            }

            // Realistic model library
            $modelsByBrand = [
                'Epson'          => ['EB-X06', 'EB-X49', 'EB-W49', 'EB-982W', 'EB-L200F', 'CO-W01', 'EB-FH52'],
                'NEC'            => ['VE281X', 'ME382U', 'NP-M311X', 'MC332W', 'PA803UL', 'P525UL'],
                'Sony'           => ['VPL-CWZ10', 'VPL-PHZ50', 'MDR-7506', 'HXR-NX80', 'ILCE-7M4', 'UWP-D21'],
                'BenQ'           => ['MS560', 'MX560', 'MW560', 'LH720', 'MH560', 'TH575'],
                'Panasonic'      => ['PT-VMZ51', 'PT-MZ880', 'AG-CX350', 'HC-X2000', 'AW-HE40'],
                'Shure'          => ['SM58-LC', 'BLX24/PG58', 'BLX288/SM58', 'GLXD24/B87A', 'MX418D/C', 'MV7'],
                'Sennheiser'     => ['EW 100 G4', 'XSW 1-825', 'EW-D 835-S', 'MK 4', 'HD 280 PRO'],
                'Audio-Technica' => ['AT2020', 'System 10 Pro', 'ATR2100x', 'ATW-1102', 'ATH-M50x'],
                'Rode'           => ['Wireless GO II', 'Wireless PRO', 'RodeLink Filmmaker', 'NT1-A', 'VideoMic Pro+'],
                'Behringer'      => ['X32 Producer', 'X32 Compact', 'Xenyx X1204USB', 'Xenyx Q802USB', 'B115D', 'XM8500'],
                'JBL'            => ['EON615', 'EON712', 'PartyBox 310', 'PRX815W', 'IRX112BT', 'EON ONE Compact'],
                'Yamaha'         => ['MG10XU', 'MG12XU', 'MG16XU', 'DBR12', 'DXR15mkII', 'StagePas 400BT', 'TF1'],
                'Mackie'         => ['Thump15A', 'Thump212', 'ProFX10v3', 'ProFX12v3', 'SRM450'],
                'Bose'           => ['S1 Pro+', 'L1 Pro8', 'L1 Pro16', 'F1 Model 812'],
                'Canon'          => ['EOS 90D', 'EOS R10', 'XA40 Pro', 'XA60', 'EOS R6 Mark II', 'Legria HF G50'],
                'Logitech'       => ['R400 Presenter', 'R800 Green Laser', 'Spotlight', 'C920 Pro HD', 'Brio 4K'],
                'AverMedia'      => ['Live Gamer Mini', 'AverVision F17-8M', 'AverVision U50', 'PW315'],
                'Da-Lite'        => ['Picture King 84"', 'Model C 120"', 'Fast-Fold Deluxe 150"'],
                'Elite Screens'  => ['Tripod Pro 84"', 'Yard Master 2', 'Spectrum 120"', 'Evanesce B'],
                'Omni'           => ['WER-10M', 'WER-20M', 'OEC-10M', 'Heavy Duty 4-Gang'],
                'Panther'        => ['PSP-0515', 'PSP-0816', 'PSP-1010 Heavy', 'PTE-20M'],
                'Ugreen'         => ['HDMI 2.1 8K 5m', 'HDMI 2.0 4K 10m', 'Braided Pro 5m', 'Ultra High Speed 10m'],
                'Philips'        => ['SWV5401P 5m', 'SWV9202 10m', 'High Speed HDMI 4K'],
                'Godox'          => ['SL-60W', 'SL-100Bi', 'VL150', 'LEDP260C Panel'],
                'Manfrotto'      => ['055 Pro3', 'MVH502A Pro Video', 'Compact Action', 'Befree Advanced'],
            ];

            $conditions = ['Good', 'Good', 'Good', 'Good', 'Good', 'Good', 'Good', 'Fair', 'Fair', 'Damaged', 'Under Repair', 'Lost'];
            $statuses = ['available', 'available', 'available', 'available', 'available', 'available', 'available', 'available', 'released', 'reserved', 'unavailable', 'damaged'];

            for ($i = 0; $i < $catCount; $i++) {
                $cid = $catIds[$i];
                $cat = $categoryModels[$cid];
                $brands = $categoryBrandMap[$cid] ?? ['Generic'];
                $unitsForThisCat = $baseUnitsPerCat + ($i < $remainder ? 1 : 0);

                for ($u = 0; $u < $unitsForThisCat; $u++) {
                    $catSeqCounters[$cid]++;
                    $seqNo = sprintf('#%03d', $catSeqCounters[$cid]);

                    $brand = $brands[$u % count($brands)];
                    $modelList = $modelsByBrand[$brand] ?? ["Model-" . strtoupper(Str::random(4))];
                    $model = $modelList[$u % count($modelList)];

                    $year = rand(2023, 2026);
                    $month = sprintf('%02d', rand(1, 12));
                    $day = sprintf('%02d', rand(1, 28));
                    $purchaseDate = "{$year}-{$month}-{$day}";

                    $cond = $conditions[$u % count($conditions)];
                    $stat = $statuses[$u % count($statuses)];

                    if ($cond === 'Damaged' || $cond === 'Under Repair') {
                        $stat = 'damaged';
                    } elseif ($cond === 'Lost') {
                        $stat = 'lost';
                    }

                    $randomHex = strtoupper(Str::random(4));
                    $serialNum = "SN-{$year}{$month}{$day}-{$randomHex}";

                    $unitInsertChunks[] = [
                        'equipment_type_id'  => $cid,
                        'equipment_types_id' => $cid,
                        'brand'              => $brand,
                        'model'              => $model,
                        'serial_number'      => $serialNum,
                        'barcode'            => $serialNum,
                        'seq_no'             => $seqNo,
                        'purchased_at'       => $purchaseDate,
                        'eq_lifespan'        => $cat->lifespan_years ?? 5,
                        'status'             => $stat,
                        'condition'          => $cond,
                        'built_in_units'     => null,
                        'built_in_models'    => null,
                        'description'        => "{$brand} {$cat->eq_name} - Standard AV Inventory",
                        'created_at'         => $now,
                        'updated_at'         => $now,
                    ];

                    // Insert in 500-record chunks for maximum DB speed
                    if (count($unitInsertChunks) >= 500) {
                        DB::table('equipment_units')->insert($unitInsertChunks);
                        $unitInsertChunks = [];
                        $batchIndex++;
                        $this->command?->info("Inserted unit batch {$batchIndex} (500 units)...");
                    }
                }
            }

            if (!empty($unitInsertChunks)) {
                DB::table('equipment_units')->insert($unitInsertChunks);
                $this->command?->info("Inserted final unit batch (" . count($unitInsertChunks) . " units).");
            }
        }

        // =========================================================================
        // 4. Seed 45 Venue Bookings (Diverse Statuses, Departments, Real Units)
        // =========================================================================
        $this->command?->info('Seeding 45 Venue Bookings...');

        $venueList = Venue::all();
        $sampleStudents = [
            ['first' => 'Raven Greg', 'middle' => 'J.', 'last' => 'Espiritu', 'email' => 'ravengreg.espiritu@urios.edu.ph', 'phone' => '09472750431'],
            ['first' => 'Angie', 'middle' => 'M.', 'last' => 'Petilo', 'email' => 'angie.petilo@urios.edu.ph', 'phone' => '09123456789'],
            ['first' => 'Jay', 'middle' => 'B.', 'last' => 'Trubias', 'email' => 'jay.trubias@urios.edu.ph', 'phone' => '09987654321'],
            ['first' => 'Christine', 'middle' => 'L.', 'last' => 'Alcantara', 'email' => 'christine.alcantara@urios.edu.ph', 'phone' => '09331234567'],
            ['first' => 'Michael', 'middle' => 'D.', 'last' => 'Del Rosario', 'email' => 'michael.delrosario@urios.edu.ph', 'phone' => '09456789012'],
            ['first' => 'Hannah', 'middle' => 'V.', 'last' => 'Villanueva', 'email' => 'hannah.villanueva@urios.edu.ph', 'phone' => '09228889900'],
            ['first' => 'Mark Joseph', 'middle' => 'A.', 'last' => 'Tan', 'email' => 'markjoseph.tan@urios.edu.ph', 'phone' => '09171112233'],
            ['first' => 'Danica', 'middle' => 'R.', 'last' => 'Mendoza', 'email' => 'danica.mendoza@urios.edu.ph', 'phone' => '09183334455'],
            ['first' => 'Joshua', 'middle' => 'C.', 'last' => 'Castillo', 'email' => 'joshua.castillo@urios.edu.ph', 'phone' => '09275556677'],
            ['first' => 'Patricia', 'middle' => 'S.', 'last' => 'Santos', 'email' => 'patricia.santos@urios.edu.ph', 'phone' => '09367778899'],
        ];

        $purposes = [
            'Department General Assembly',
            'Capstone Project Research Presentation',
            'College Seminar & Skills Workshop',
            'Student Council Leadership Training',
            'Faculty Academic Colloquium',
            'Inter-College Quiz Bee & Debate',
            'Accreditation Virtual Conference',
            'Cultural Heritage Film Screening',
            'Techno-Summit IT Conference',
            'Nursing Pinning Rehearsal',
        ];

        $deptCodes = $departments->pluck('code')->toArray();
        if (empty($deptCodes)) {
            $deptCodes = ['CITEC', 'CCJE', 'CTE', 'CoA', 'CoN', 'CAS', 'CORE', 'CEnTech', 'CIHT'];
        }

        // Available released/good units for assignment
        $projectorUnits = EquipmentUnit::whereHas('equipmentType', fn($q) => $q->where('eq_name', 'like', '%Projector%'))
            ->limit(50)->pluck('serial_number')->toArray();
        $micUnits = EquipmentUnit::whereHas('equipmentType', fn($q) => $q->where('eq_name', 'like', '%Microphone%'))
            ->limit(50)->pluck('serial_number')->toArray();

        // 45 Booking distributions:
        // 18 Completed (past)
        // 5 On-going / Post-Inspection (today)
        // 12 Approved / Scheduled (future)
        // 6 Pending (future)
        // 4 Rejected / Cancelled
        $todayDate = Carbon::today()->format('Y-m-d');

        for ($b = 1; $b <= 45; $b++) {
            $person = $sampleStudents[$b % count($sampleStudents)];
            $deptCode = $deptCodes[$b % count($deptCodes)];
            $dept = $departments->firstWhere('code', $deptCode);
            $venue = $venueList[$b % $venueList->count()];
            $purpose = $purposes[$b % count($purposes)];

            // Date and Status scheduling
            if ($b <= 18) {
                // Completed past bookings
                $daysAgo = rand(3, 60);
                $usageDate = Carbon::today()->subDays($daysAgo)->format('Y-m-d');
                $status = 'completed';
                $assigned = !empty($projectorUnits) ? ['0-0' => $projectorUnits[$b % count($projectorUnits)]] : null;
            } elseif ($b <= 23) {
                // Today active bookings
                $usageDate = $todayDate;
                $status = ($b % 2 === 0) ? 'on-going' : 'post-inspection';
                $assigned = !empty($projectorUnits) ? ['0-0' => $projectorUnits[$b % count($projectorUnits)]] : null;
            } elseif ($b <= 35) {
                // Approved upcoming bookings
                $daysAhead = rand(1, 25);
                $usageDate = Carbon::today()->addDays($daysAhead)->format('Y-m-d');
                $status = 'approved';
                $assigned = null;
            } elseif ($b <= 41) {
                // Pending upcoming bookings
                $daysAhead = rand(3, 30);
                $usageDate = Carbon::today()->addDays($daysAhead)->format('Y-m-d');
                $status = 'pending';
                $assigned = null;
            } else {
                // Rejected / Cancelled
                $usageDate = Carbon::today()->addDays(rand(2, 14))->format('Y-m-d');
                $status = ($b % 2 === 0) ? 'rejected' : 'cancelled';
                $assigned = null;
            }

            do {
                $refCode = sprintf('TRK-AVR%04d', rand(1000, 9999));
            } while (DB::table('tracking_numbers')->where('reference_code', $refCode)->exists());

            $trackingId = DB::table('tracking_numbers')->insertGetId([
                'reference_code'   => $refCode,
                'reservation_type' => 'venue_booking',
                'reservation_id'   => 0,
                'status'           => $status,
                'approved_by'      => in_array($status, ['approved', 'on-going', 'post-inspection', 'completed']) ? $adminUser->id : null,
                'rejected_by'      => ($status === 'rejected') ? $adminUser->id : null,
                'created_at'       => Carbon::now(),
                'updated_at'       => Carbon::now(),
            ]);

            $booking = VenueBooking::create([
                'academic_term_id'          => $academicTerm->id,
                'tracking_number_id'        => $trackingId,
                'venue_id'                  => $venue->id,
                'submission_channel'        => 'online_self',
                'first_name'                => $person['first'],
                'middle_name'               => $person['middle'] ?? null,
                'last_name'                 => $person['last'],
                'filer_name'                => implode(' ', array_filter([$person['first'], $person['middle'] ?? null, $person['last']])),
                'email_address'             => $person['email'],
                'department_id'             => $dept?->id,
                'program_office'            => $deptCode,
                'contact_number'            => $person['phone'],
                'classification'            => 'student',
                'place_of_use'              => 'inside',
                'purpose'                   => $purpose,
                'equipment_notes'           => "Equipment-Needed: 1 Projector, 2 Wireless Mic, 1 Screen.",
                'no_of_person'              => min($venue->capacity ?? 100, rand(40, 140)),
                'date_of_usage'             => $usageDate,
                'reservation_end_date'      => $usageDate,
                'extend_reservation_end_date' => $usageDate,
                'time_start'                => '08:00:00',
                'time_end'                  => '12:00:00',
                'agreed_to_policy'          => true,
                'status'                    => $status,
                'assigned_units'            => $assigned,
                'claim_timestamp'           => in_array($status, ['approved', 'on-going', 'completed']) ? Carbon::parse($usageDate)->setTime(7, 45) : null,
                'is_complete'               => ($status === 'completed'),
                'rejection_reason'          => ($status === 'rejected') ? 'Schedule conflict with university official institutional program.' : null,
            ]);

            DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $booking->id]);

            // Seed requested equipment pivot
            $reqCats = array_slice($categoryModels, 0, 3);
            foreach ($reqCats as $rc) {
                VenueBookingEquipment::create([
                    'venue_booking_id'   => $booking->id,
                    'equipment_type_id'  => $rc->id,
                    'equipment_types_id' => $rc->id,
                    'quantity_requested' => rand(1, 2),
                ]);
            }
        }

        // =========================================================================
        // 5. Seed 45 Equipment Borrowings (Diverse Statuses, Real Units Assigned)
        // =========================================================================
        $this->command?->info('Seeding 45 Equipment Borrowings...');

        for ($eb = 1; $eb <= 45; $eb++) {
            $person = $sampleStudents[($eb + 3) % count($sampleStudents)];
            $deptCode = $deptCodes[($eb + 2) % count($deptCodes)];
            $dept = $departments->firstWhere('code', $deptCode);
            // Distribute borrowing statuses:
            // 1-16: Completed past loans (returned)
            // 17-22: On-going loans (today, checked out)
            // 23-25: Late return loans (past date, not yet returned)
            // 26-35: Approved upcoming loans
            // 36-41: Pending upcoming loans
            // 42-45: Rejected / Cancelled loans
            if ($eb <= 16) {
                $daysAgo = rand(2, 45);
                $usageDate = Carbon::today()->subDays($daysAgo)->format('Y-m-d');
                $status = 'completed';
                $assignedSerial = $projectorUnits[$eb % count($projectorUnits)] ?? "SN-20261011-RET{$eb}";
                $assigned = ['0-0' => $assignedSerial];
                $returnedAt = Carbon::parse($usageDate)->setTime(17, 30);
                $pickedUpAt = Carbon::parse($usageDate)->setTime(8, 15);
            } elseif ($eb <= 22) {
                $usageDate = $todayDate;
                $status = 'on-going';
                $assignedSerial = $projectorUnits[$eb % count($projectorUnits)] ?? "SN-20261019-ACT{$eb}";
                $assigned = ['0-0' => $assignedSerial];
                $returnedAt = null;
                $pickedUpAt = Carbon::now()->subHours(2);
                EquipmentUnit::where('serial_number', $assignedSerial)->update(['status' => 'released']);
            } elseif ($eb <= 25) {
                $daysAgo = rand(1, 7);
                $usageDate = Carbon::today()->subDays($daysAgo)->format('Y-m-d');
                $status = 'late return';
                $assignedSerial = $micUnits[$eb % count($micUnits)] ?? "SN-20261015-LTE{$eb}";
                $assigned = ['0-0' => $assignedSerial];
                $returnedAt = null;
                $pickedUpAt = Carbon::parse($usageDate)->setTime(9, 0);
                EquipmentUnit::where('serial_number', $assignedSerial)->update(['status' => 'released']);
            } elseif ($eb <= 35) {
                $daysAhead = rand(1, 20);
                $usageDate = Carbon::today()->addDays($daysAhead)->format('Y-m-d');
                $status = 'approved';
                $assigned = null;
                $returnedAt = null;
                $pickedUpAt = null;
            } elseif ($eb <= 41) {
                $daysAhead = rand(2, 25);
                $usageDate = Carbon::today()->addDays($daysAhead)->format('Y-m-d');
                $status = 'pending';
                $assigned = null;
                $returnedAt = null;
                $pickedUpAt = null;
            } else {
                $usageDate = Carbon::today()->addDays(rand(1, 10))->format('Y-m-d');
                $status = ($eb % 2 === 0) ? 'rejected' : 'cancelled';
                $assigned = null;
                $returnedAt = null;
                $pickedUpAt = null;
            }

            do {
                $refCode = sprintf('EQ-202610-%04d', rand(100, 9999));
            } while (DB::table('tracking_numbers')->where('reference_code', $refCode)->exists());

            $trackingId = DB::table('tracking_numbers')->insertGetId([
                'reference_code'   => $refCode,
                'reservation_type' => 'equipment_borrowing',
                'reservation_id'   => 0,
                'status'           => $status,
                'approved_by'      => in_array($status, ['approved', 'on-going', 'completed', 'late return']) ? $adminUser->id : null,
                'rejected_by'      => ($status === 'rejected') ? $adminUser->id : null,
                'created_at'       => Carbon::now(),
                'updated_at'       => Carbon::now(),
            ]);

            $borrow = EquipmentBorrow::create([
                'academic_term_id'        => $academicTerm->id,
                'tracking_number_id'      => $trackingId,
                'submission_channel'      => 'online_self',
                'first_name'              => $person['first'],
                'middle_name'             => $person['middle'] ?? null,
                'last_name'               => $person['last'],
                'filer_name'              => implode(' ', array_filter([$person['first'], $person['middle'] ?? null, $person['last']])),
                'email_address'           => $person['email'],
                'department_id'           => $dept?->id,
                'program_office'          => $deptCode,
                'contact_number'          => $person['phone'],
                'classification'          => 'student',
                'place_of_use'            => 'AVR / Campus Grounds',
                'purpose'                 => $purpose,
                'date_of_usage'           => $usageDate,
                'extend_of_date_returned' => $usageDate,
                'time_start'              => '08:30:00',
                'time_end'                => '16:30:00',
                'assigned_units'          => $assigned,
                'status'                  => $status,
                'rejection_reason'        => ($status === 'rejected') ? 'Equipment requested is undergoing scheduled routine maintenance.' : null,
                'returned_at'             => $returnedAt,
            ]);

            DB::table('tracking_numbers')->where('id', $trackingId)->update(['reservation_id' => $borrow->id]);

            // Add 1 to 2 borrow item lines
            $itemCats = array_slice($categoryModels, ($eb % 5), 2);
            foreach ($itemCats as $idx => $ic) {
                EquipmentBorrowItem::create([
                    'equipment_borrow_id' => $borrow->id,
                    'equipment_type_id'   => $ic->id,
                    'equipment_types_id'  => $ic->id,
                    'equipment_unit_id'   => null,
                    'quantity_requested'  => 1,
                    'picked_up_at'        => $pickedUpAt,
                    'returned_at'         => $returnedAt,
                ]);
            }
        }

        // =========================================================================
        // 6. Recalculate Category Inventory Counts (100% Data Integrity)
        // =========================================================================
        $this->command?->info('Recalculating and synchronizing category inventory counts...');

        $allCategories = EquipmentType::all();
        foreach ($allCategories as $cat) {
            $total = EquipmentUnit::where('equipment_type_id', $cat->id)->count();
            $released = EquipmentUnit::where('equipment_type_id', $cat->id)->whereIn('status', ['released', 'in_use', 'borrowed'])->count();
            $reserved = EquipmentUnit::where('equipment_type_id', $cat->id)->where('status', 'reserved')->count();
            $damaged = EquipmentUnit::where('equipment_type_id', $cat->id)->whereIn('status', ['damaged', 'unavailable', 'maintenance'])->count();
            $lost = EquipmentUnit::where('equipment_type_id', $cat->id)->whereIn('status', ['lost', 'decommissioned'])->count();
            $available = max(0, $total - $released - $reserved - $damaged - $lost);

            $cat->update([
                'total_quantity'    => $total,
                'available_count'   => $available,
                'released_count'    => $released,
                'reserved_count'    => $reserved,
                'damaged_count'     => $damaged,
                'lost_count'        => $lost,
                'unavailable_count' => $damaged,
            ]);
        }

        // Invalidate backend caches so API returns fresh stats instantly
        Cache::flush();

        $finalUnitCount = EquipmentUnit::count();
        $finalCatCount = EquipmentType::count();
        $finalBrandCount = Brand::count();
        $finalVenueBookingCount = VenueBooking::count();
        $finalBorrowCount = EquipmentBorrow::count();

        $this->command?->info("=================================================");
        $this->command?->info("Seeding Completed Successfully!");
        $this->command?->info("Total Categories: {$finalCatCount}");
        $this->command?->info("Total Brands:     {$finalBrandCount}");
        $this->command?->info("Total Units:      {$finalUnitCount}");
        $this->command?->info("Venue Bookings:   {$finalVenueBookingCount}");
        $this->command?->info("Equipment Loans:  {$finalBorrowCount}");
        $this->command?->info("=================================================");
    }
}
