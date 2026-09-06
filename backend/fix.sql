USE fsuu;
UPDATE inspections SET is_late = 0, timeliness = 'on_time', violation_type = NULL, `condition` = 'good', notes = 'Good Condition' WHERE inspectable_type LIKE '%VenueBooking' AND violation_type = 'Late Return / Extension' AND `condition` != 'damaged';
