import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Protect routes that need auth
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/guest-list') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/crm')
  ) {
    // Check if user is authenticated via custom cookie
    const sessionCookie = request.cookies.get('unievent_session')
    const email = sessionCookie?.value

    if (!email) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role verification
    // Fetch user role from user_roles table using service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .single()

    if (!roleData || !roleData.role) {
      // User is authenticated but has no role assigned
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }

    // specific route protection
    if (pathname.startsWith('/crm') && roleData.role !== 'Super Admin' && roleData.role !== 'Marketing') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Block receptionist from analytics
    if (pathname.startsWith('/analytics') && roleData.role === 'Receptionist') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
