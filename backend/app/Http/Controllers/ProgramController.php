<?php

namespace App\Http\Controllers;

use App\Models\Program;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    public function index()
    {
        return response()->json(Program::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:programs,name',
            'description' => 'nullable|string',
        ]);

        $program = Program::create($validated);
        return response()->json($program, 201);
    }

    public function update(Request $request, Program $program)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:programs,name,' . $program->id,
            'description' => 'nullable|string',
        ]);

        $program->update($validated);
        return response()->json($program);
    }

    public function destroy(Program $program)
    {
        $program->delete();
        return response()->json(null, 204);
    }
}
