{{--
  Shared partial: equipment unit table
  Expects:
    $units  – collection / array of EquipmentUnit objects or arrays
    $mode   – 'release' (Custody Handover) | 'receipt' (Return & Inspection Clearance)
--}}
@php
    $mode     = $mode ?? 'release';
    $unitRows = collect($units ?? []);
@endphp

@if($unitRows->isNotEmpty())
<div style="overflow-x: auto; margin: 12px 0;">
  <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 6px;">
    <thead>
      <tr style="background-color: #0f172a; color: #ffffff;">
        <th style="text-align: center; padding: 9px 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 36px; border-right: 1px solid #1e293b;">#</th>
        <th style="text-align: left; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #1e293b;">Asset Barcode</th>
        <th style="text-align: left; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #1e293b;">Serial Number</th>
        <th style="text-align: left; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #1e293b;">Brand &amp; Model</th>
        <th style="text-align: left; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #1e293b;">Borrowed Equipment</th>
        @if($mode === 'receipt')
        <th style="text-align: center; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Inspection Result</th>
        @endif
      </tr>
    </thead>
    <tbody>
      @foreach($unitRows as $i => $unit)
      @php
          $barcode  = is_object($unit) ? ($unit->barcode ?: ($unit->serial_number ?? 'N/A')) : ($unit['barcode'] ?? $unit['serial_number'] ?? 'N/A');
          $serial   = is_object($unit) ? ($unit->serial_number ?: ($unit->barcode ?? 'N/A')) : ($unit['serial_number'] ?? $unit['barcode'] ?? 'N/A');
          
          $brandVal = is_object($unit) ? (is_string($unit->brand ?? null) ? $unit->brand : '') : ($unit['brand'] ?? '');
          $modelVal = is_object($unit) ? ($unit->model ?? '') : ($unit['model'] ?? '');
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

          // Resolve Built-in accessory names
          $builtInNames = [];
          if (is_object($unit) && !empty($unit->equipmentType?->built_in_names)) {
              $builtInNames = $unit->equipmentType->built_in_names;
          }

          $rawBuilt = is_object($unit) ? ($unit->built_in_units ?? $unit->built_in_models ?? []) : ($unit['built_in_units'] ?? $unit['built_in_models'] ?? []);
          if (is_string($rawBuilt)) {
              try { $rawBuilt = json_decode($rawBuilt, true) ?? []; } catch (\Throwable $e) { $rawBuilt = []; }
          }

          if (empty($builtInNames) && !empty($rawBuilt) && is_array($rawBuilt)) {
              $numericIds = array_values(array_filter($rawBuilt, fn($v) => is_numeric($v) && (int)$v > 0));
              if (!empty($numericIds)) {
                  try {
                      $childUnits = \App\Models\EquipmentUnit::with('equipmentType')->whereIn('id', array_map('intval', $numericIds))->get();
                      foreach ($childUnits as $cu) {
                          $cName = $cu->equipmentType?->eq_name ?? $cu->equipmentType?->name ?? $cu->model;
                          if ($cName && !in_array($cName, $builtInNames)) {
                              $builtInNames[] = $cName;
                          }
                      }
                  } catch (\Throwable $e) {}
              }
              foreach ($rawBuilt as $val) {
                  if (is_string($val) && !is_numeric($val) && !empty($val) && !in_array($val, $builtInNames)) {
                      $builtInNames[] = trim($val);
                  }
              }
          }

          // Fallback from $equipmentList if built-ins still empty
          if (empty($builtInNames) && !empty($equipmentList)) {
              foreach ($equipmentList as $eqItem) {
                  if (is_array($eqItem) && !empty($eqItem['built_ins'])) {
                      $builtInNames = $eqItem['built_ins'];
                      break;
                  }
              }
          }

          // Condition check
          $cond = is_object($unit) ? ($unit->condition ?? 'Good') : ($unit['condition'] ?? 'Good');
          $normCond = strtolower(trim((string)$cond));
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

          $rowBg = ($i % 2 === 0) ? '#ffffff' : '#f8fafc';
      @endphp
      <tr style="background-color: {{ $rowBg }}; border-bottom: 1px solid #e2e8f0;">
        <td style="text-align: center; padding: 10px 8px; color: #64748b; font-weight: 600; font-size: 12px; border-right: 1px solid #e2e8f0;">
          {{ sprintf('%02d', $i + 1) }}
        </td>
        <td style="padding: 10px 12px; border-right: 1px solid #e2e8f0;">
          <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-weight: 700; color: #1e40af; font-size: 13px; background-color: #eff6ff; padding: 3px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">
            {{ $barcode }}
          </span>
        </td>
        <td style="padding: 10px 12px; color: #334155; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 12px; border-right: 1px solid #e2e8f0;">
          {{ $serial }}
        </td>
        <td style="padding: 10px 12px; color: #0f172a; font-weight: 600; border-right: 1px solid #e2e8f0;">
          {{ $brandModel }}
        </td>
        <td style="padding: 10px 12px; color: #0f172a; border-right: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">
            {{ $equipmentTypeName }}
          </div>
          @if(!empty($builtInNames) && count($builtInNames) > 0)
            <div style="margin-top: 4px; font-size: 11px; color: #475569;">
              <span style="font-weight: 700; color: #1e40af; margin-right: 2px;">Built-in:</span>
              @foreach($builtInNames as $bName)
                <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 700; margin: 1px 2px;">{{ $bName }}</span>
              @endforeach
            </div>
          @endif
        </td>
        @if($mode === 'receipt')
        <td style="text-align: center; padding: 10px 12px;">
          <span style="display: inline-block; background-color: {{ $condBadgeBg }}; color: {{ $condBadgeText }}; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid {{ $condBadgeText }}33;">
            {{ $condLabel }}
          </span>
        </td>
        @endif
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@else
<div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 14px; text-align: center; margin: 12px 0;">
  <span style="color: #64748b; font-size: 13px; font-style: italic;">No individual physical unit serial numbers logged.</span>
</div>
@endif
