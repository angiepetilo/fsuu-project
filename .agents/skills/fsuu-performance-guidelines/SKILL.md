---
name: fsuu-performance-guidelines
description: Master performance guidelines, N+1 query elimination, eager loading, database indexing, React memory caching (useDataCache), and 0ms in-memory filtering (useMemo) for the FSUU Reserve & Booking System.
---

# Master Performance Optimization & Lag Fix Guide

A specialized engineering performance guide tailored specifically for the Father Saturnino Urios University (FSUU) Reserve & Booking System (Laravel 11 REST API, MySQL 8, React 19 + Vite).

**Problem:** Why does an application take 2–5 seconds to load even with only 2–5 records?  
**Root Causes:** Unoptimized N+1 queries in backend loops, missing eager loading, re-fetching API data on every component render/tab switch, un-indexed database fields, and lack of a React Memory Cache layer.

---

## 🚀 PHASE 1: Fix Backend N+1 Query Lag (Laravel REST API)

### Rule 1.1: Eager Loading (`with()`)
Always eager-load nested relationships upfront to resolve all data in 2 batch queries regardless of dataset size:
```php
// Controller: Eager-load all relationships upfront with pagination
public function index(Request $request)
{
    return AvrVenueBooking::with(['venue', 'approvals', 'documents'])
        ->latest()
        ->paginate(20);
}
```

### Rule 1.2: Compact Binary Datatypes & Aggregation
- Select only necessary columns or use `selectRaw` for heavy statistical reports.
- Avoid pulling thousands of raw models into PHP memory just to compute counts.

---

## ⚡ PHASE 2: Implement Frontend React Context & Memory Cache (`useDataCache`)

If the frontend triggers a new HTTP fetch request every time a user switches tabs, opens modals, or navigates back and forth, the app will feel laggy. Reusable memory caching stores API responses in browser RAM:

```javascript
// src/hooks/useDataCache.js
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

const memoryCache = {};

export function useDataCache(cacheKey, apiEndpoint, options = {}) {
  const { forceRefresh = false, ttl = 300000 } = options; // 5 minute default TTL
  const cachedItem = memoryCache[cacheKey];

  const isCacheValid = cachedItem && (Date.now() - cachedItem.timestamp < ttl);

  const [data, setData] = useState(isCacheValid ? cachedItem.data : null);
  const [loading, setLoading] = useState(!isCacheValid);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache && isCacheValid) {
      setData(cachedItem.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(apiEndpoint);
      memoryCache[cacheKey] = {
        data: res.data,
        timestamp: Date.now(),
      };
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, apiEndpoint, isCacheValid]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  const invalidateCache = () => {
    delete memoryCache[cacheKey];
    fetchData(true);
  };

  return { data, loading, error, refresh: invalidateCache };
}
```

---

## 🎨 PHASE 3: 0ms Client-Side Filtering (`useMemo`)

Never call the backend API every time a user types in a search box or clicks a filter status tab (Pending, Approved, Ongoing, Completed). Perform filtering in browser RAM in `< 1ms`:

```javascript
import React, { useState, useMemo } from 'react';

export default function BookingsTable({ rawBookings = [] }) {
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter in browser RAM in < 1ms!
    const filteredBookings = useMemo(() => {
        return rawBookings.filter(item => {
            const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
            const matchesSearch = 
                (item.requestor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.reference_code || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [rawBookings, statusFilter, searchQuery]);

    return (
        <div>
            {/* Filter buttons hit 0ms RAM filtering */}
            <button onClick={() => setStatusFilter('All')}>All</button>
            <button onClick={() => setStatusFilter('approved')}>Approved</button>
            <button onClick={() => setStatusFilter('pending')}>Pending</button>
            
            {/* Instant Search Input */}
            <input 
                type="text" 
                placeholder="Search booking..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Render Filtered Data */}
            <table>
                <tbody>
                  {filteredBookings.map(booking => (
                      <tr key={booking.id}>
                          <td>{booking.reference_code}</td>
                          <td>{booking.requestor_name}</td>
                          <td>{booking.status}</td>
                      </tr>
                  ))}
                </tbody>
            </table>
        </div>
    );
}
```

---

## 🗄️ PHASE 4: Database Indexing Checklist (MySQL)

Ensure indexes exist in database migration files for columns used in filters or relationships:

```php
Schema::table('avr_venue_bookings', function (Blueprint $table) {
    $table->index(['venue_id', 'start_datetime', 'end_datetime'], 'avr_bookings_venue_time_idx');
    $table->index('status');
    $table->index('reference_code');
});
```

---

## 🏆 Summary Checklist for Sub-0.5s Speed

| # | Optimization | Purpose | Impact |
| :-: | :--- | :--- | :--- |
| **1** | **Eager Loading (`with()`)** | Eliminates N+1 query loops | 2s ➔ 0.05s |
| **2** | **Server-side Pagination (`paginate(20)`)** | Limits JSON payload to 15 KB | Instant load |
| **3** | **React Memory Cache (`useDataCache`)** | Prevents re-fetching API on tab switch | 0ms tab switch |
| **4** | **In-Memory Filter (`useMemo`)** | Filter/search inside browser RAM | 0ms filter lag |
| **5** | **Database Indexing** | Instant SQL lookups | 0.001s queries |
