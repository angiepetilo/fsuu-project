<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\EquipmentUnit;
use App\Models\EquipmentType;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class EquipmentUnitController extends Controller
{
    /**
     * Display a listing of all physical equipment units.
     */
    public function index(Request $request): JsonResponse
    {
        \App\Services\EquipmentCategoryService::autoSyncUnitConditions();

        $query = EquipmentUnit::with('equipmentType')
            ->whereNull('equipment_units.archived_at');

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created physical equipment unit and update category stock count.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Normalize equipment_type_id from aliases (category_id, category name)
        if (!$request->has('equipment_type_id') || empty($request->input('equipment_type_id'))) {
            if ($request->filled('category_id')) {
                $request->merge(['equipment_type_id' => $request->input('category_id')]);
            } elseif ($request->filled('category')) {
                $cat = EquipmentType::where('eq_name', $request->input('category'))
                    ->orWhere('name', $request->input('category'))
                    ->first();
                if ($cat) {
                    $request->merge(['equipment_type_id' => $cat->id]);
                }
            }
        }

        // 2. Normalize barcode from aliases (unit_code, code) or generate unique fallback
        $rawBarcode = trim((string)($request->input('barcode') ?? $request->input('unit_code') ?? $request->input('code') ?? ''));
        if ($rawBarcode === '') {
            $prefix = 'BC-' . date('Ymd') . '-';
            $rand = strtoupper(bin2hex(random_bytes(3)));
            $rawBarcode = $prefix . $rand;
        }
        $request->merge(['barcode' => $rawBarcode]);

        // 3. Normalize dates and numeric lifespans
        if ($request->input('purchased_at') === '' || $request->input('date_purchased') === '') {
            $request->merge(['purchased_at' => null]);
        } elseif (!$request->has('purchased_at') && $request->filled('date_purchased')) {
            $request->merge(['purchased_at' => $request->input('date_purchased')]);
        }
        if ($request->input('eq_lifespan') === '' || $request->input('lifespan_years') === '') {
            $request->merge(['eq_lifespan' => 5]);
        } elseif (!$request->has('eq_lifespan') && $request->filled('lifespan_years')) {
            $request->merge(['eq_lifespan' => (int)$request->input('lifespan_years')]);
        }

        $validated = $request->validate([
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'brand'             => 'nullable|string|max:255',
            'model'             => 'nullable|string|max:255',
            'barcode'           => [
                'required',
                'string',
                'max:255',
                Rule::unique('equipment_units', 'barcode'),
            ],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ], [
            'equipment_type_id.required' => 'The equipment category is required.',
            'equipment_type_id.exists'   => 'The selected equipment category does not exist.',
            'barcode.required'          => 'The barcode field is required.',
            'barcode.unique'            => 'This barcode is already assigned to another physical unit. Barcodes must be unique.',
        ]);

        $rawCondition = $request->input('condition', 'Good');
        $canonicalCondition = match(strtolower(trim((string)$rawCondition))) {
            'damaged' => 'Damaged',
            'lost' => 'Lost',
            'under repair', 'under_repair' => 'Under Repair',
            'minor wear' => 'Minor Wear',
            default => 'Good',
        };

        $unit = EquipmentUnit::create([
            'equipment_type_id' => $validated['equipment_type_id'],
            'brand'             => $validated['brand'] ?? null,
            'model'             => $validated['model'] ?? null,
            'barcode'           => trim($validated['barcode']),
            'purchased_at'      => $validated['purchased_at'] ?? now()->toDateString(),
            'eq_lifespan'       => $validated['eq_lifespan'] ?? 5,
            'status'            => $validated['status'] ?? 'available',
            'condition'         => $canonicalCondition,
            'description'       => $validated['description'] ?? null,
        ]);

        // Sync category stock count
        $this->syncCategoryStock($unit->equipment_type_id);

        return response()->json($unit->load('equipmentType'), 201);
    }

    /**
     * Update the specified physical equipment unit.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        // Normalize aliases for update
        if ($request->filled('category_id') && !$request->has('equipment_type_id')) {
            $request->merge(['equipment_type_id' => $request->input('category_id')]);
        }
        if ($request->filled('unit_code') && !$request->has('barcode')) {
            $request->merge(['barcode' => trim((string)$request->input('unit_code'))]);
        } elseif ($request->has('barcode')) {
            $request->merge(['barcode' => trim((string)$request->input('barcode'))]);
        }
        if ($request->input('purchased_at') === '' || $request->input('date_purchased') === '') {
            $request->merge(['purchased_at' => null]);
        }
        if ($request->input('eq_lifespan') === '' || $request->input('lifespan_years') === '') {
            $request->merge(['eq_lifespan' => 5]);
        }

        $validated = $request->validate([
            'equipment_type_id' => 'sometimes|exists:equipment_types,id',
            'brand'             => 'nullable|string|max:255',
            'model'             => 'nullable|string|max:255',
            'barcode'           => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('equipment_units', 'barcode')->ignore($unit->id),
            ],
            'purchased_at'      => 'nullable|date',
            'eq_lifespan'       => 'nullable|integer|min:1',
            'status'            => 'nullable|string|max:50',
            'condition'         => 'nullable|string|max:100',
            'description'       => 'nullable|string',
        ], [
            'barcode.unique' => 'This barcode is already assigned to another physical unit. Barcodes must be unique.',
        ]);

        if (isset($validated['condition'])) {
            $validated['condition'] = match(strtolower(trim($validated['condition']))) {
                'damaged' => 'Damaged',
                'lost' => 'Lost',
                'under repair', 'under_repair' => 'Under Repair',
                'minor wear' => 'Minor Wear',
                default => 'Good',
            };
        }

        if (isset($validated['barcode'])) {
            $validated['barcode'] = trim($validated['barcode']);
        }

        $oldTypeId = $unit->equipment_type_id;

        $unit->update($validated);

        // Sync category stock counts for old and new category
        $this->syncCategoryStock($oldTypeId);
        if ($unit->equipment_type_id !== $oldTypeId) {
            $this->syncCategoryStock($unit->equipment_type_id);
        }

        return response()->json($unit->load('equipmentType'));
    }

    /**
     * Soft-delete physical equipment unit and decrement category stock.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $unit = EquipmentUnit::with('equipmentType')->findOrFail($id);

        $typeId = $unit->equipment_type_id;

        $unit->delete();

        $this->syncCategoryStock($typeId);

        return response()->json(['message' => 'Equipment unit archived successfully']);
    }

    /**
     * Download sample CSV template for equipment units bulk import.
     */
    public function downloadTemplate(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="equipment_units_import_template.csv"',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Microsoft Excel compatibility
            fputs($handle, "\xEF\xBB\xBF");

            // Header columns
            fputcsv($handle, [
                'Category',
                'Brand',
                'Model',
                'Barcode',
                'Date Purchased',
                'Lifespan (Years)',
                'Condition',
                'Status',
                'Description',
            ]);

            // Sample rows to guide the client
            fputcsv($handle, ['Projector', 'Epson', 'PowerLite 1780W', 'PRJ-EPS-001', '2025-06-15', '5', 'Good', 'available', 'AVR Storage Cabinet 1']);
            fputcsv($handle, ['Projector', 'Epson', 'PowerLite 1780W', 'PRJ-EPS-002', '2025-06-15', '5', 'Good', 'available', 'AVR Storage Cabinet 1']);
            fputcsv($handle, ['Sound System', 'Yamaha', 'StagePas 400BT', 'SND-YAM-001', '2025-08-20', '5', 'Good', 'available', 'Audio Rack System A']);
            fputcsv($handle, ['Camera', 'Sony', 'Alpha A7 IV', 'CAM-SNY-001', '2026-01-10', '4', 'Good', 'available', 'Media Production Bag #1']);
            fputcsv($handle, ['Microphone', 'Shure', 'SM58 Wireless', 'MIC-SHU-001', '2025-11-05', '3', 'Good', 'available', 'Wireless Mic Set Alpha']);

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Bulk import equipment units from a CSV file.
     */
    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file'                  => 'required|file|max:10240', // max 10MB
            'auto_create_category'  => 'nullable',
            'duplicate_action'      => 'nullable|string|in:skip,error',
        ]);

        $file = $request->file('file');
        $autoCreateCat = filter_var($request->input('auto_create_category', true), FILTER_VALIDATE_BOOLEAN);
        $duplicateAction = $request->input('duplicate_action', 'skip');

        $path = $file->getRealPath();
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Unable to read the uploaded CSV file.'], 422);
        }

        // Detect and skip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Read header row
        $headerRow = fgetcsv($handle, 4096, ',');
        if ($headerRow === false || empty($headerRow)) {
            fclose($handle);
            return response()->json(['message' => 'The uploaded CSV file is empty.'], 422);
        }

        // Map header column indexes
        $colMap = [];
        foreach ($headerRow as $idx => $rawHeader) {
            $h = strtolower(trim((string)$rawHeader));
            $h = preg_replace('/[^a-z0-9]/', '', $h); // normalize e.g. "lifespan (years)" -> "lifespanyears"

            if (in_array($h, ['category', 'categoryname', 'equipmentcategory', 'eqname', 'type'], true)) {
                $colMap['category'] = $idx;
            } elseif (in_array($h, ['brand', 'brandname', 'make'], true)) {
                $colMap['brand'] = $idx;
            } elseif (in_array($h, ['model', 'modelname'], true)) {
                $colMap['model'] = $idx;
            } elseif (in_array($h, ['barcode', 'barcodeid', 'unitcode', 'serial', 'serialnumber', 'serialno', 'code'], true)) {
                $colMap['barcode'] = $idx;
            } elseif (in_array($h, ['datepurchased', 'purchasedat', 'purchasedate', 'date', 'purchase'], true)) {
                $colMap['date_purchased'] = $idx;
            } elseif (in_array($h, ['lifespanyears', 'lifespan', 'eqlifespan', 'years'], true)) {
                $colMap['lifespan'] = $idx;
            } elseif (in_array($h, ['condition'], true)) {
                $colMap['condition'] = $idx;
            } elseif (in_array($h, ['status'], true)) {
                $colMap['status'] = $idx;
            } elseif (in_array($h, ['description', 'notes', 'remarks'], true)) {
                $colMap['description'] = $idx;
            }
        }

        if (!isset($colMap['category'])) {
            fclose($handle);
            return response()->json([
                'message' => 'Missing required "Category" column in CSV header. Please download the template for reference.',
            ], 422);
        }

        // Preload categories mapped by lowercase name
        $existingCategories = EquipmentType::all()->keyBy(function ($c) {
            return strtolower(trim($c->eq_name ?? $c->name ?? ''));
        });

        // Preload existing barcodes from DB
        $existingDbBarcodes = EquipmentUnit::pluck('barcode')
            ->map(fn($b) => strtolower(trim((string)$b)))
            ->flip()
            ->all();

        // Preload existing brands
        $existingBrands = Brand::pluck('name')
            ->map(fn($b) => strtolower(trim((string)$b)))
            ->flip()
            ->all();

        $batchSeenBarcodes = [];
        $rowsToInsert = [];
        $categoriesCreated = [];
        $brandsCreated = [];
        $affectedCategoryIds = [];
        $skippedDetails = [];
        $rowNumber = 1; // row 1 was header

        while (($row = fgetcsv($handle, 4096, ',')) !== false) {
            $rowNumber++;

            // Skip entirely blank rows
            if (empty(array_filter($row, fn($v) => trim((string)$v) !== ''))) {
                continue;
            }

            $catRaw = isset($colMap['category']) ? trim((string)($row[$colMap['category']] ?? '')) : '';
            if ($catRaw === '') {
                $skippedDetails[] = [
                    'row'     => $rowNumber,
                    'barcode' => isset($colMap['barcode']) ? ($row[$colMap['barcode']] ?? 'N/A') : 'N/A',
                    'reason'  => 'Category is required and was empty.',
                ];
                continue;
            }

            $catKey = strtolower($catRaw);
            if (!isset($existingCategories[$catKey])) {
                if (!$autoCreateCat) {
                    $skippedDetails[] = [
                        'row'     => $rowNumber,
                        'barcode' => isset($colMap['barcode']) ? ($row[$colMap['barcode']] ?? 'N/A') : 'N/A',
                        'reason'  => "Category '{$catRaw}' does not exist and auto-create is disabled.",
                    ];
                    continue;
                }

                // Auto-create category
                $newCat = EquipmentType::create([
                    'eq_name'              => $catRaw,
                    'name'                 => $catRaw,
                    'equipment_types_name' => $catRaw,
                    'status'               => 'active',
                    'total_quantity'       => 0,
                    'available_count'      => 0,
                    'lifespan_years'       => 5,
                ]);

                $existingCategories[$catKey] = $newCat;
                $categoriesCreated[] = $newCat->eq_name;
            }

            $category = $existingCategories[$catKey];
            $affectedCategoryIds[$category->id] = true;

            // Barcode processing
            $rawBarcode = isset($colMap['barcode']) ? trim((string)($row[$colMap['barcode']] ?? '')) : '';
            if ($rawBarcode === '') {
                $rawBarcode = 'BC-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
            }

            $barcodeKey = strtolower($rawBarcode);

            // Duplicate check (against DB and within current CSV batch)
            if (isset($existingDbBarcodes[$barcodeKey]) || isset($batchSeenBarcodes[$barcodeKey])) {
                if ($duplicateAction === 'error') {
                    fclose($handle);
                    return response()->json([
                        'message' => "Duplicate barcode detected at row {$rowNumber}: '{$rawBarcode}'. Barcodes must be unique.",
                    ], 422);
                }

                $skippedDetails[] = [
                    'row'     => $rowNumber,
                    'barcode' => $rawBarcode,
                    'reason'  => "Barcode '{$rawBarcode}' already exists in database or earlier row in file.",
                ];
                continue;
            }

            $batchSeenBarcodes[$barcodeKey] = true;

            // Date processing
            $rawDate = isset($colMap['date_purchased']) ? trim((string)($row[$colMap['date_purchased']] ?? '')) : '';
            $parsedDate = null;
            if ($rawDate !== '') {
                $ts = strtotime($rawDate);
                if ($ts !== false) {
                    $parsedDate = date('Y-m-d', $ts);
                }
            }
            if (!$parsedDate) {
                $parsedDate = now()->toDateString();
            }

            // Lifespan
            $rawLifespan = isset($colMap['lifespan']) ? (int)trim((string)$row[$colMap['lifespan']]) : 5;
            if ($rawLifespan <= 0 || $rawLifespan > 50) {
                $rawLifespan = 5;
            }

            // Condition
            $rawCond = isset($colMap['condition']) ? strtolower(trim((string)$row[$colMap['condition']])) : 'good';
            $canonicalCondition = match ($rawCond) {
                'damaged'                       => 'Damaged',
                'lost'                          => 'Lost',
                'under repair', 'under_repair'  => 'Under Repair',
                'minor wear', 'worn'            => 'Minor Wear',
                default                         => 'Good',
            };

            // Status
            $rawStatus = isset($colMap['status']) ? strtolower(trim((string)$row[$colMap['status']])) : 'available';
            if (in_array($canonicalCondition, ['Damaged', 'Lost', 'Under Repair'], true)) {
                $canonicalStatus = 'unavailable';
            } else {
                $canonicalStatus = ($rawStatus === 'unavailable') ? 'unavailable' : 'available';
            }

            $brand = isset($colMap['brand']) ? trim((string)$row[$colMap['brand']]) : null;
            if ($brand !== null && $brand !== '') {
                $bKey = strtolower($brand);
                if (!isset($existingBrands[$bKey])) {
                    try {
                        Brand::create([
                            'name'        => $brand,
                            'status'      => 'active',
                            'description' => 'Auto-registered from equipment CSV import',
                        ]);
                        $existingBrands[$bKey] = true;
                        $brandsCreated[] = $brand;
                    } catch (\Throwable $th) {
                        // Brand might already exist due to case insensitivity or concurrent process
                    }
                }
            }

            $model = isset($colMap['model']) ? trim((string)$row[$colMap['model']]) : null;
            $description = isset($colMap['description']) ? trim((string)$row[$colMap['description']]) : null;

            $rowsToInsert[] = [
                'equipment_type_id' => $category->id,
                'brand'             => $brand ?: null,
                'model'             => $model ?: null,
                'barcode'           => $rawBarcode,
                'purchased_at'      => $parsedDate,
                'eq_lifespan'       => $rawLifespan,
                'status'            => $canonicalStatus,
                'condition'         => $canonicalCondition,
                'description'       => $description ?: null,
                'created_at'        => now(),
                'updated_at'        => now(),
            ];
        }

        fclose($handle);

        if (empty($rowsToInsert)) {
            return response()->json([
                'success'           => false,
                'message'           => 'No valid equipment unit rows were found to import.',
                'imported_count'    => 0,
                'skipped_count'     => count($skippedDetails),
                'skipped_details'   => $skippedDetails,
                'categories_created'=> array_values(array_unique($categoriesCreated)),
                'brands_created'    => array_values(array_unique($brandsCreated)),
            ], 422);
        }

        // Insert records inside database transaction
        DB::transaction(function () use ($rowsToInsert) {
            // Chunk inserts by 100 for optimal performance
            foreach (array_chunk($rowsToInsert, 100) as $chunk) {
                EquipmentUnit::insert($chunk);
            }
        });

        // Sync stock counts for all affected categories
        foreach (array_keys($affectedCategoryIds) as $typeId) {
            $this->syncCategoryStock($typeId);
        }

        $importedCount = count($rowsToInsert);
        $skippedCount = count($skippedDetails);

        return response()->json([
            'success'            => true,
            'message'            => "Successfully imported {$importedCount} equipment " . ($importedCount === 1 ? 'unit' : 'units') . '.',
            'imported_count'     => $importedCount,
            'skipped_count'      => $skippedCount,
            'skipped_details'    => $skippedDetails,
            'categories_created' => array_values(array_unique($categoriesCreated)),
            'brands_created'     => array_values(array_unique($brandsCreated)),
        ], 200);
    }

    /**
     * Helper to dynamically calculate and update EquipmentType stock counts
     */
    public function syncCategoryStock(int $typeId): void
    {
        try {
            $type = EquipmentType::find($typeId);
            if (!$type) return;

            $totalUnits = EquipmentUnit::where('equipment_type_id', $typeId)->count();
            $availableUnits = EquipmentUnit::where('equipment_type_id', $typeId)
                ->where('status', 'available')
                ->whereNotIn(DB::raw('LOWER(`condition`)'), ['damaged', 'lost', 'under repair', 'worn'])
                ->count();

            $type->update([
                'total_quantity'  => $totalUnits,
                'available_count' => $availableUnits,
            ]);
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\Log::warning("Failed to sync category stock for type {$typeId}: " . $th->getMessage());
        }
    }
}
