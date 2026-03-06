import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    // Rate limit: 2 uploads per minute (recordings são grandes)
    const rlResult = apiLimiter.check(request, 2)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const rideId = formData.get('ride_id') as string
    const duration = parseInt(formData.get('duration') as string, 10)

    if (!audioFile || !rideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check user recording preference
    const { data: preference } = await supabase
      .from('user_recording_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!preference?.enabled) {
      return NextResponse.json({ error: 'Recording not enabled for user' }, { status: 403 })
    }

    // Verify user is participant in this ride
    const { data: ride } = await supabase
      .from('rides')
      .select('passenger_id, driver_id')
      .eq('id', rideId)
      .single()

    if (!ride || (ride.passenger_id !== user.id && ride.driver_id !== user.id)) {
      return NextResponse.json({ error: 'Not authorized for this ride' }, { status: 403 })
    }

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Encrypt audio with AES-256-GCM
    const algorithm = 'aes-256-gcm'
    const key = crypto.randomBytes(32) // 256-bit key
    const iv = crypto.randomBytes(16) // 128-bit IV
    
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Store encrypted audio in Supabase Storage
    const fileName = `${rideId}/${Date.now()}-${user.id}.encrypted`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ride-recordings')
      .upload(fileName, encrypted, {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[v0] Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 })
    }

    // Store metadata in database with encryption keys
    const { data: recording, error: dbError } = await supabase
      .from('ride_recordings')
      .insert({
        ride_id: rideId,
        recorded_by: user.id,
        storage_path: fileName,
        duration_seconds: duration,
        encryption_key: key.toString('base64'),
        encryption_iv: iv.toString('base64'),
        encryption_auth_tag: authTag.toString('base64'),
        file_size_bytes: encrypted.length,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[v0] Database insert error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('ride-recordings').remove([fileName])
      return NextResponse.json({ error: 'Failed to save recording metadata' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: recording.id,
      duration: duration,
      encrypted: true,
    })
  } catch (error) {
    console.error('[v0] Recording upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
