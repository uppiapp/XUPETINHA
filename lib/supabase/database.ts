import { createClient } from './server'

// Helper functions para operações no banco de dados
// Usa as tabelas reais: profiles, driver_profiles, driver_locations, rides, ride_offers, ride_tracking
// RPCs disponíveis: get_nearby_drivers, calculate_ride_price

export async function findNearbyDrivers(
  pickupLat: number,
  pickupLng: number,
  radiusKm: number = 5
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_nearby_drivers', {
    p_lat: pickupLat,
    p_lng: pickupLng,
    p_radius_km: radiusKm,
  })

  if (error) {
    console.error('[db] Error finding nearby drivers:', error)
    throw error
  }

  return data
}

export async function calculateRidePrice(
  distanceKm: number,
  durationMinutes: number = 0
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('calculate_ride_price', {
    p_distance_km: distanceKm,
    p_duration_minutes: durationMinutes,
  })

  if (error) {
    console.error('[db] Error calculating ride price:', error)
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
    console.error('[db] Error fetching profile:', error)
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
    console.error('[db] Error fetching driver_profile:', error)
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
    console.error('[db] Error fetching ride:', error)
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
    console.error('[db] Error fetching user rides:', error)
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
    console.error('[db] Error fetching driver rides:', error)
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
    console.error('[db] Error fetching ride offers:', error)
    throw error
  }

  return offers
}

export async function getUserWalletBalance(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[db] Error fetching wallet balance:', error)
    return 0
  }

  return data?.wallet_balance ?? 0
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
    console.error('[db] Error fetching notifications:', error)
    throw error
  }

  return notifications
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('[db] Error marking notification as read:', error)
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
    console.error('[db] Error fetching favorites:', error)
    throw error
  }

  return favorites
}

export async function validatePromoCode(code: string, userId: string) {
  const supabase = await createClient()

  const { data: promo, error: promoError } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (promoError) {
    return { valid: false, message: 'Cupom inválido' }
  }

  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return { valid: false, message: 'Cupom expirado' }
  }

  if (promo.max_uses && (promo.used_count ?? 0) >= promo.max_uses) {
    return { valid: false, message: 'Cupom esgotado' }
  }

  const { data: userUsage } = await supabase
    .from('promo_code_uses')
    .select('id')
    .eq('promo_code_id', promo.id)
    .eq('user_id', userId)

  if (userUsage && promo.max_uses_per_user && userUsage.length >= promo.max_uses_per_user) {
    return { valid: false, message: 'Você já usou este cupom' }
  }

  return { valid: true, promo }
}

export async function getUserAchievements(userId: string) {
  const supabase = await createClient()

  const { data: achievements, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements!achievement_id(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[db] Error fetching achievements:', error)
    throw error
  }

  return achievements
}

export async function getLeaderboard(limit: number = 10) {
  const supabase = await createClient()

  const { data: leaderboard, error } = await supabase
    .from('leaderboard')
    .select(`
      *,
      user:profiles!user_id(id, full_name, avatar_url)
    `)
    .order('total_points', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[db] Error fetching leaderboard:', error)
    throw error
  }

  return leaderboard
}

export async function getSystemConfig(key: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .single()

  if (error) {
    console.error('[db] Error fetching system config:', error)
    return null
  }

  return data?.value
}

export async function getActiveHotZones() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hot_zones')
    .select('*')
    .eq('is_active', true)
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)

  if (error) {
    console.error('[db] Error fetching hot zones:', error)
    return []
  }

  return data
}
