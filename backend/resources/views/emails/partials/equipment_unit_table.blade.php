{{--
  Shared partial: equipment unit card layout
  Expects:
    $units  – collection / array of EquipmentUnit objects or arrays
    $mode   – 'release' (Custody Handover) | 'receipt' (Return & Inspection Clearance) | 'late_cards' (Overdue Notice)
--}}
@php
    $mode     = $mode ?? 'release';
    $unitRows = collect($units ?? []);
@endphp

@if($unitRows->isNotEmpty())
<div style="margin: 12px 0;">
  @foreach($unitRows as $i => $unit)
  @php
      $barcode  = is_object($unit) ? ($unit->barcode ?: ($unit->serial_number ?? 'N/A')) : ($unit['barcode'] ?? $unit['serial_number'] ?? 'N/A');
      $serial   = is_object($unit) ? ($unit->serial_number ?: ($unit->barcode ?? 'N/A')) : ($unit['serial_number'] ?? $unit['barcode'] ?? 'N/A');
      
      $rawSeq = is_object($unit)
          ? ($unit->seq_no ?? $unit->sequence_no ?? null)
          : ($unit['seq_no'] ?? $unit['sequence_no'] ?? null);

      if (empty($rawSeq) && is_object($unit) && !empty($unit->id)) {
          try {
              $foundUnit = \App\Models\EquipmentUnit::find($unit->id);
              $rawSeq = $foundUnit?->seq_no ?? $foundUnit?->sequence_no;
          } catch (\Throwable $e) {}
      }
      if (empty($rawSeq) && !empty($barcode) && $barcode !== 'N/A') {
          try {
              $foundUnit = \App\Models\EquipmentUnit::where('barcode', $barcode)->orWhere('serial_number', $barcode)->first();
              $rawSeq = $foundUnit?->seq_no ?? $foundUnit?->sequence_no;
          } catch (\Throwable $e) {}
      }

      $seqNo = !empty($rawSeq)
          ? (str_starts_with(trim((string)$rawSeq), '#') ? trim((string)$rawSeq) : '#' . trim((string)$rawSeq))
          : ($rawSeq === '0' ? '#0' : null);

      $brandVal = is_object($unit)
          ? (is_string($unit->brand ?? null) && trim($unit->brand) !== '' ? trim($unit->brand) : ($unit->equipmentType?->brand ?? ''))
          : ($unit['brand'] ?? '');
      if (empty($brandVal) && is_object($unit) && !empty($unit->equipment_type_id)) {
          try {
              $et = \App\Models\EquipmentType::withTrashed()->find($unit->equipment_type_id);
              $brandVal = $et?->brand ?? '';
          } catch (\Throwable $e) {}
      }

      $modelVal = is_object($unit)
          ? (is_string($unit->model ?? null) && trim($unit->model) !== '' ? trim($unit->model) : '')
          : ($unit['model'] ?? '');
      if (empty($modelVal) && is_object($unit) && !empty($unit->model_name)) {
          $modelVal = trim((string)$unit->model_name);
      }
      $brandModel = trim("{$brandVal} {$modelVal}") ?: 'Standard Unit';

      // Resolve Equipment Category Name
      $equipmentTypeName = is_object($unit)
          ? ($unit->equipmentType?->eq_name ?? $unit->equipmentType?->name ?? null)
          : ($unit['equipment_type_name'] ?? null);

      if (!$equipmentTypeName && is_object($unit) && !empty($unit->equipment_type_id)) {
          try {
              $et = \App\Models\EquipmentType::withTrashed()->find($unit->equipment_type_id);
              $equipmentTypeName = $et?->eq_name ?? $et?->name;
          } catch (\Throwable $e) {}
      }

      if (!$equipmentTypeName && !empty($equipmentList)) {
          $firstEq = is_array($equipmentList) ? reset($equipmentList) : null;
          if ($firstEq) {
              $equipmentTypeName = is_array($firstEq) ? ($firstEq['name'] ?? null) : null;
          }
      }

      if (!$equipmentTypeName && !empty($booking?->equipment_name)) {
          $equipmentTypeName = $booking->equipment_name;
      }

      if (!$equipmentTypeName) {
          $equipmentTypeName = $modelVal ?: 'Equipment Unit';
      }

      // Resolve Built-in accessories and physical units with serial numbers
      $builtInItems = [];
      $builtInHandledIds = [];

      $rawBuilt = is_object($unit) ? ($unit->built_in_units ?? $unit->built_in_models ?? []) : ($unit['built_in_units'] ?? $unit['built_in_models'] ?? []);
      if (is_string($rawBuilt)) {
          try { $rawBuilt = json_decode($rawBuilt, true) ?? []; } catch (\Throwable $e) { $rawBuilt = []; }
      }
      if (empty($rawBuilt) && is_object($unit) && !empty($unit->equipmentType?->built_in_units)) {
          $rawBuilt = $unit->equipmentType->built_in_units;
          if (is_string($rawBuilt)) {
              try { $rawBuilt = json_decode($rawBuilt, true) ?? []; } catch (\Throwable $e) { $rawBuilt = []; }
          }
      }

      if (!empty($rawBuilt) && is_array($rawBuilt)) {
          $idsAndCodes = array_values(array_filter($rawBuilt, fn($v) => !empty($v)));
          $numericIds  = array_values(array_filter($idsAndCodes, fn($v) => is_numeric($v) && (int)$v > 0));
          $stringCodes = array_values(array_filter($idsAndCodes, fn($v) => !is_numeric($v) && is_string($v)));

          $childUnits = collect();
          try {
              $childUnits = \App\Models\EquipmentUnit::with('equipmentType')->where(function($q) use ($numericIds, $stringCodes) {
                  if (!empty($numericIds)) {
                      $q->whereIn('id', array_map('intval', $numericIds));
                  }
                  if (!empty($stringCodes)) {
                      $q->orWhereIn('barcode', $stringCodes)
                        ->orWhereIn('serial_number', $stringCodes);
                  }
              })->get();
          } catch (\Throwable $e) {}

          foreach ($childUnits as $cu) {
              $cName = $cu->equipmentType?->eq_name ?? $cu->equipmentType?->name ?? $cu->model ?? 'Built-in Unit';
              $cSerial = $cu->serial_number ?: ($cu->barcode ?: null);
              $cRawSeq = $cu->seq_no ?? $cu->sequence_no ?? null;
              $cSeqNo = !empty($cRawSeq)
                  ? (str_starts_with(trim((string)$cRawSeq), '#') ? trim((string)$cRawSeq) : '#' . trim((string)$cRawSeq))
                  : ($cRawSeq === '0' ? '#0' : null);
              $cBrand = $cu->brand ?? $cu->equipmentType?->brand ?? null;
              $cModel = $cu->model ?? null;
              $builtInItems[] = [
                  'name'   => $cName,
                  'serial' => $cSerial,
                  'seq_no' => $cSeqNo,
                  'brand'  => $cBrand,
                  'model'  => $cModel,
                  'label'  => $cSerial ? "{$cName} (SN: {$cSerial})" : $cName,
              ];
              $builtInHandledIds[] = (string)$cu->id;
              if ($cu->barcode) $builtInHandledIds[] = (string)$cu->barcode;
              if ($cu->serial_number) $builtInHandledIds[] = (string)$cu->serial_number;
          }

          foreach ($idsAndCodes as $val) {
              $strVal = trim((string)$val);
              if (!in_array($strVal, $builtInHandledIds)) {
                  $typeName = null;
                  $cSerial = null;
                  $cSeqNo = null;
                  $cBrand = null;
                  $cModel = null;
                  try {
                      $fallbackUnit = \App\Models\EquipmentUnit::with('equipmentType')->where('id', $strVal)->orWhere('barcode', $strVal)->orWhere('serial_number', $strVal)->first();
                      if ($fallbackUnit) {
                          $typeName = $fallbackUnit->equipmentType?->eq_name ?? $fallbackUnit->equipmentType?->name ?? $fallbackUnit->model;
                          $cSerial = $fallbackUnit->serial_number ?: ($fallbackUnit->barcode ?: null);
                          $fbRawSeq = $fallbackUnit->seq_no ?? $fallbackUnit->sequence_no;
                          $cSeqNo = !empty($fbRawSeq) ? (str_starts_with(trim((string)$fbRawSeq), '#') ? trim((string)$fbRawSeq) : '#' . trim((string)$fbRawSeq)) : null;
                          $cBrand = $fallbackUnit->brand ?? $fallbackUnit->equipmentType?->brand ?? null;
                          $cModel = $fallbackUnit->model ?? null;
                      } elseif (is_numeric($strVal)) {
                          $et = \App\Models\EquipmentType::withTrashed()->find((int)$strVal);
                          if ($et) {
                              $typeName = $et->eq_name ?? $et->name;
                              $cBrand = $et->brand ?? null;
                          }
                      }
                  } catch (\Throwable $e) {}
                  $finalName = $typeName ?: $strVal;
                  $builtInItems[] = [
                      'name'   => $finalName,
                      'serial' => $cSerial,
                      'seq_no' => $cSeqNo,
                      'brand'  => $cBrand,
                      'model'  => $cModel,
                      'label'  => $finalName,
                  ];
              }
          }
      }

      // If child units not found in rawBuilt, fallback to category built_in_names
      if (empty($builtInItems)) {
          $typeBuiltIns = [];
          if (is_object($unit) && !empty($unit->equipmentType?->built_in_names)) {
              $typeBuiltIns = $unit->equipmentType->built_in_names;
          } elseif (!empty($equipmentList)) {
              foreach ($equipmentList as $eqItem) {
                  if (is_array($eqItem) && !empty($eqItem['built_ins'])) {
                      $typeBuiltIns = $eqItem['built_ins'];
                      break;
                  }
              }
          }
          if (is_array($typeBuiltIns)) {
              foreach ($typeBuiltIns as $bName) {
                  if (!empty($bName)) {
                      $builtInItems[] = [
                          'name'   => (string)$bName,
                          'serial' => null,
                          'seq_no' => null,
                          'brand'  => null,
                          'model'  => null,
                          'label'  => (string)$bName,
                      ];
                  }
              }
          }
      }

      // Condition check for inspection receipts
      $cond = is_object($unit) ? ($unit->condition ?? 'Good') : ($unit['condition'] ?? 'Good');
      $normCond = strtolower(trim((string)$cond));
      $isDefective = str_contains($normCond, 'damage') || str_contains($normCond, 'defect') || str_contains($normCond, 'lost') || str_contains($normCond, 'miss');
      
      $condBadgeBg = match(true) {
          str_contains($normCond, 'damage') || str_contains($normCond, 'defect') => '#fef2f2',
          str_contains($normCond, 'lost') || str_contains($normCond, 'miss')     => '#fff1f2',
          default                                                                  => '#f0fdf4',
      };
      $condBadgeText = match(true) {
          str_contains($normCond, 'damage') || str_contains($normCond, 'defect') => '#991b1b',
          str_contains($normCond, 'lost') || str_contains($normCond, 'miss')     => '#9f1239',
          default                                                                  => '#166534',
      };
      $condLabel = match(true) {
          str_contains($normCond, 'damage') => 'DAMAGED',
          str_contains($normCond, 'lost')   => 'UNIT LOST',
          str_contains($normCond, 'miss')   => 'MISSING ACC.',
          default                           => 'PASS — GOOD COND.',
      };

      // Border accent matching modern design standard
      $accentColor = '#2563eb'; // blue for release / ongoing custody
      if ($mode === 'late_cards') {
          $accentColor = '#dc2626'; // red for overdue
      } elseif ($mode === 'receipt') {
          $accentColor = $isDefective ? '#ef4444' : '#10b981'; // green for cleared, red for problem
      }
  @endphp

  {{-- Modern Card Layout (Replacing old black-header table) --}}
  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid {{ $accentColor }}; border-radius: 10px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    
    {{-- Card Header: Title, Sequence No, Inspection/Overdue Badge --}}
    <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: 11px 15px; vertical-align: middle;">
          <table style="border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <span style="display: inline-block; font-size: 10px; font-weight: 800; color: #475569; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; margin-right: 7px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Unit {{ sprintf('%02d', $i + 1) }}
                </span>
                <strong style="font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">
                  {{ $equipmentTypeName }}
                </strong>
                @if(!empty($brandModel) && $brandModel !== 'Standard Unit')
                  <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">
                    {{ $brandModel }}
                  </div>
                @endif
              </td>
              <td style="text-align: right; vertical-align: middle; white-space: nowrap; padding-left: 8px;">
                @if($seqNo)
                  <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 11px; font-weight: 800; color: #b45309; background-color: #fef3c7; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 5px; vertical-align: middle;">
                    {{ $seqNo }}
                  </span>
                @endif
                @if($mode === 'receipt')
                  <span style="display: inline-block; background-color: {{ $condBadgeBg }}; color: {{ $condBadgeText }}; font-weight: 700; font-size: 10.5px; padding: 3px 8px; border-radius: 5px; border: 1px solid {{ $condBadgeText }}33; margin-left: 6px; vertical-align: middle;">
                    {{ $condLabel }}
                  </span>
                @elseif($mode === 'late_cards')
                  <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-weight: 800; font-size: 10.5px; padding: 3px 8px; border-radius: 5px; border: 1px solid #fca5a5; margin-left: 6px; vertical-align: middle;">
                    OVERDUE
                  </span>
                @endif
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    {{-- Card Body: Asset Barcode & Serial Number Key-Value Grid --}}
    <div style="padding: 12px 15px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 0;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          {{-- Asset Barcode --}}
          <td style="width: 50%; padding-right: 6px; vertical-align: top;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                Asset Barcode
              </div>
              <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 11.5px; font-weight: 700; color: #1e40af; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 4px;">
                {{ $barcode }}
              </span>
            </div>
          </td>
          {{-- Serial Number --}}
          <td style="width: 50%; padding-left: 6px; vertical-align: top;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                Serial Number
              </div>
              <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12px; font-weight: 700; color: #0f172a; padding: 2px 0;">
                {{ $serial }}
              </span>
            </div>
          </td>
        </tr>
      </table>

      {{-- Brand & Model Specific Row --}}
      @if(!empty($brandVal) || !empty($modelVal))
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; color: #475569;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            @if(!empty($brandVal))
              <td style="padding: 4px 10px 2px 2px; width: 50%; vertical-align: middle;">
                <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">Brand:</span>
                <strong style="color: #0f172a; margin-left: 4px; font-size: 12px;">{{ $brandVal }}</strong>
              </td>
            @endif
            @if(!empty($modelVal))
              <td style="padding: 4px 2px 2px 0; width: 50%; vertical-align: middle;">
                <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">Model Name:</span>
                <span style="color: #334155; font-weight: 600; margin-left: 4px; font-size: 12px;">{{ $modelVal }}</span>
              </td>
            @endif
          </tr>
        </table>
      @endif

      {{-- Included Accessories & Built-in Units --}}
      @if(!empty($builtInItems) && count($builtInItems) > 0)
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
          <div style="font-size: 10.5px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Included Accessories &amp; Built-In Units:
          </div>
          <div>
            @foreach($builtInItems as $bItem)
              <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 9px; margin: 2px 4px 4px 0; font-size: 11.5px; color: #1e293b; line-height: 1.4;">
                @if(!empty($bItem['seq_no']))
                  <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 10px; font-weight: 800; color: #b45309; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 3px; padding: 1px 4px; margin-right: 4px;">{{ $bItem['seq_no'] }}</span>
                @endif
                <strong>{{ $bItem['name'] }}</strong>
                @if(!empty($bItem['brand']))
                  <span style="color: #475569; font-weight: 700; margin-left: 3px;">[{{ $bItem['brand'] }}]</span>
                @endif
                @if(!empty($bItem['model']))
                  <span style="color: #64748b; margin-left: 3px;">{{ $bItem['model'] }}</span>
                @endif
                @if(!empty($bItem['serial']))
                  <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 10.5px; color: #047857; font-weight: 700; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3px; padding: 1px 5px; margin-left: 4px;">SN: {{ $bItem['serial'] }}</span>
                @endif
              </div>
            @endforeach
          </div>
        </div>
      @endif

    </div>

  </div>
  @endforeach
</div>
@else
<div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; text-align: center; margin: 12px 0;">
  <span style="color: #64748b; font-size: 13px; font-style: italic;">No individual physical unit serial numbers logged.</span>
</div>
@endif