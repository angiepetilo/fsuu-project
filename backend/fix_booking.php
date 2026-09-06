<?php
$bookings = \App\Models\VenueBooking::whereHas('trackingNumber', function($q) {
    $q->where('reference_code', 'TRK-AVR6054');
})->get();
foreach($bookings as $b) {
    if (\Illuminate\Support\Facades\Schema::hasColumn('venue_bookings', 'status')) {
        $b->update(['status' => 'completed']);
    }
    \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('id', $b->tracking_number_id)->update(['status' => 'completed']);
    \Illuminate\Support\Facades\DB::table('inspections')->where('inspectable_id', $b->id)
        ->where('inspectable_type', \App\Models\VenueBooking::class)
        ->update([
            'condition' => 'good', 
            'violation_type' => null,
            'is_late' => 0,
            'minutes_late' => 0,
            'timeliness' => 'on_time'
        ]);
    echo "Fixed TRK-AVR6054\n";
}

$inspections = \Illuminate\Support\Facades\DB::table('inspections')
    ->where('inspectable_type', \App\Models\VenueBooking::class)
    ->where('condition', 'damaged')
    ->where(function($q) {
        $q->whereNull('violation_type')->orWhere('violation_type', '')->orWhere('notes', 'like', '%Good Condition%');
    })->get();
foreach($inspections as $i) {
    \Illuminate\Support\Facades\DB::table('inspections')->where('id', $i->id)->update([
        'condition' => 'good',
        'violation_type' => null
    ]);
    \Illuminate\Support\Facades\DB::table('venue_bookings')->where('id', $i->inspectable_id)->update(['status' => 'completed']);
    \Illuminate\Support\Facades\DB::table('tracking_numbers')->where('reservation_type', 'venue_booking')->where('reservation_id', $i->inspectable_id)->update(['status' => 'completed']);
    echo "Fixed {$i->id}\n";
}
