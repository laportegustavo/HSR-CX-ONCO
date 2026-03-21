import { NextResponse } from 'next/server';
import { getStaffFromSheet } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const staff = await getStaffFromSheet();
        return NextResponse.json({ 
            success: true,
            total_staff: staff.length, 
            users: staff.map(s => ({ 
                username: s.username, 
                type: s.type, 
                password_length: s.password?.length,
                id: s.id,
                email: s.email
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
