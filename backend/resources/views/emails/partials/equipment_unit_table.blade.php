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
        <th style="text-align: left; padding: 9px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #1e293b;">Included Accessories</th>
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
          $modelVal = is_object($unit) ? ($unit->model ?? $unit->equipmentType?->eq_name ?? $unit->equipmentType?->name ?? 'Equipment Unit') : ($unit['model'] ?? 'Equipment Unit');
          $brandModel = trim("{$brandVal} {$modelVal}") ?: 'Standard Unit';

          // Extract accessories / peripherals
          $builtIn = is_object($unit) ? ($unit->built_in_units ?? $unit->built_in_models ?? []) : ($unit['built_in_units'] ?? $unit['built_in_models'] ?? []);
          if (is_string($builtIn)) {
              try { $builtIn = json_decode($builtIn, true) ?? []; } catch (\Throwable $e) { $builtIn = []; }
          }
          $accessoriesList = !empty($builtIn) && is_array($builtIn) ? implode(', ', $builtIn) : 'Power Cord / Standard Cable Set';

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
        <td style="padding: 10px 12px; color: #475569; font-size: 12px; border-right: 1px solid #e2e8f0;">
          {{ $accessoriesList }}
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
