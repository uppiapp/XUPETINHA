import { createClient } from './server'

// Helper functions para operações no banco de dados
// Usa as tabelas corretas: profiles, driver_profiles, driver_locations, rides, ride_offers

export async function findNearbyDrivers(
  pickupLat: number,
  pickupLng: number,
  radiusKm: number = 5,
  vehicleType?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('find_nearby_drivers', {
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    radius_km: radiusKm,
    vehicle_type_filter: vehicleType || null,
  })

  if (error) {
    console.error('[v0] Error finding nearby drivers:', error)
    throw error
  }

  return data
}

export async function calculateRidePrice(
  distanceKm: number,
  durationMinutes: number,
  vehicleType: string = 'standard'
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('calculate_ride_price', {
    distance_km: distanceKm,
    duration_minutes: durationMinutes,
    vehicle_type_param: vehicleType,
  })

  if (error) {
    console.error('[v0] Error calculating ride price:', error)
    throw error
  }

  return data
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[v0] Error fetching profile:', error)
    throw error
  }

  return { profile }
}

export async function getDriverProfile(userId: string) {
  const supabase = await createClient()

  const { data: driver, error } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[v0] Error fetching driver_profile:', error)
    throw error
  }

  return driver
}

export async function getRideWithDetails(rideId: string) {
  const supabase = await createClient()

  const { data: ride, error } = await supabase
    .from('rides')
    .select(`
      *,
      passenger:profiles!passenger_id(id, full_name, avatar_url, phone),
      driver:profiles!driver_id(id, full_name, avatar_url, phone),
      driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type)
    `)
    .eq('id', rideId)
    .single()

  if (error) {
    console.error('[v0] Error fetching ride:', error)
    throw error
  }

  return ride
}

export async function getUserRides(userId: string, limit: number = 10) {
  const supabase = await createClient()

  const { data: rides, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:profiles!driver_id(id, full_name, avatar_url, phone),
      driver_profile:driver_profiles!driver_id(rating, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type)
    `)
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching user rides:', error)
    throw error
  }

  return rides
}

export async function getDriverRides(driverId: string, limit: number = 10) {
  const supabase = await createClient()

  const { data: rides, error } = await supabase
    .from('rides')
    .select(`
      *,
      passenger:profiles!passenger_id(id, full_name, avatar_url, phone)
    `)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching driver rides:', error)
    throw error
  }

  return rides
}

export async function getRideOffers(rideId: string) {
  const supabase = await createClient()

  const { data: offers, error } = await supabase
    .from('ride_offers')
    .select(`
      *,
      driver:profiles!driver_id(id, full_name, avatar_url, phone),
      driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_type)
    `)
    .eq('ride_id', rideId)
    .order('offered_price', { ascending: true })

  if (error) {
    console.error('[v0] Error fetching ride offers:', error)
    throw error
  }

  return offers
}

export async function getUserWalletBalance(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('calculate_wallet_balance', { p_user_id: userId })

  if (error) {
    console.error('[v0] Error fetching wallet balance:', error)
    return 0
  }

  return data ?? 0
}

export async function getUserNotifications(userId: string, limit: number = 20) {
  const supabase = await createClient()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching notifications:', error)
    throw error
  }

  return notifications
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('[v0] Error marking notification as read:', error)
    throw error
  }
}

export async function getUserFavorites(userId: string) {
  const supabase = await createClient()

  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching favorites:', error)
    throw error
  }

  return favorites
}

export async function getActiveCoupons() {
  const supabase = await createClient()

  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .gte('valid_until', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching coupons:', error)
    throw error
  }

  return coupons
}

export async function validateCoupon(code: string, userId: string) {
  const supabase = await createClient()

  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (couponError) {
    return { valid: false, message: 'Cupom inválido' }
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, message: 'Cupom expirado' }
  }

  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, message: 'Cupom esgotado' }
  }

  const { data: userUsage } = await supabase
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId)

  if (userUsage && coupon.user_usage_limit && userUsage.length >= coupon.user_usage_limit) {
    return { valid: false, message: 'Você já usou este cupom' }
  }

  return { valid: true, coupon }
}

export async function getUserAchievements(userId: string) {
  const supabase = await createClient()

  const { data: achievements, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching achievements:', error)
    throw error
  }

  return achievements
}

export async function getLeaderboard(
  period: 'weekly' | 'monthly' | 'all_time' = 'weekly',
  limit: number = 10
) {
  const supabase = await createClient()

  const { data: leaderboard, error } = await supabase
    .from('leaderboard')
    .select(`
      *,
      user:profiles!user_id(id, full_name, avatar_url)
    `)
    .eq('period', period)
    .order('rank', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching leaderboard:', error)
    throw error
  }

  return leaderboard
}

export async function getSocialPosts(limit: number = 20) {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select(`
      *,
      author:profiles!user_id(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching social posts:', error)
    throw error
  }

  return posts
}
