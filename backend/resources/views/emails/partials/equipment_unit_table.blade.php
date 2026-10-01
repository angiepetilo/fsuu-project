{{--
  Shared partial: equipment unit table
  Expects:
    $units  – collection / array of EquipmentUnit objects  (brand, model, serial_number, condition)
    $mode   – 'release' (Email 3) | 'receipt' (Email 4)
--}}
@php
    $mode     = $mode ?? 'release';
    $unitRows = collect($units ?? []);
@endphp

@if($unitRows->isNotEmpty())
<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="text-align:left;padding:6px 8px;color:#475569;font-weight:700;border-bottom:2px solid #e2e8f0;">#</th>
      <th style="text-align:left;padding:6px 8px;color:#475569;font-weight:700;border-bottom:2px solid #e2e8f0;">Serial / Barcode</th>
      <th style="text-align:left;padding:6px 8px;color:#475569;font-weight:700;border-bottom:2px solid #e2e8f0;">Model</th>
      <th style="text-align:left;padding:6px 8px;color:#475569;font-weight:700;border-bottom:2px solid #e2e8f0;">Brand</th>
      @if($mode === 'receipt')
      <th style="text-align:left;padding:6px 8px;color:#475569;font-weight:700;border-bottom:2px solid #e2e8f0;">Condition</th>
      @endif
    </tr>
  </thead>
  <tbody>
    @foreach($unitRows as $i => $unit)
    @php
        $serial   = is_object($unit) ? ($unit->serial_number ?: ($unit->barcode ?? 'N/A')) : ($unit['serial_number'] ?? $unit['barcode'] ?? 'N/A');
        $model    = is_object($unit) ? ($unit->model  ?? 'N/A') : ($unit['model']  ?? 'N/A');
        $brand    = is_object($unit) ? ($unit->brand  ?? 'N/A') : ($unit['brand']  ?? 'N/A');
        $cond     = is_object($unit) ? ($unit->condition ?? 'Good') : ($unit['condition'] ?? 'Good');
        $condColor = match(strtolower(trim($cond))) {
            'damaged' => '#92400e',
            'lost'    => '#991b1b',
            default   => '#166534',
        };
        $rowBg = ($i % 2 === 0) ? '#ffffff' : '#f8fafc';
    @endphp
    <tr style="background:{{ $rowBg }};">
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;">{{ $i + 1 }}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700;color:#1d4ed8;">{{ $serial }}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#0f172a;">{{ $model }}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#0f172a;">{{ $brand }}</td>
      @if($mode === 'receipt')
      <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;color:{{ $condColor }};">{{ ucfirst($cond) }}</td>
      @endif
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="color:#64748b;font-style:italic;font-size:13px;">No physical unit details on record.</p>
@endif
