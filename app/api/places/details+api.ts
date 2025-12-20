
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!placeId) {
        return Response.json({ error: 'Missing place_id' }, { status: 400 });
    }

    if (!apiKey) {
        return Response.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
    }

    try {
        const googleResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,name&key=${apiKey}`
        );
        const data = await googleResponse.json();
        return Response.json(data);
    } catch (error) {
        console.error('Google Places Proxy Error:', error);
        return Response.json({ error: 'Failed to fetch from Google' }, { status: 500 });
    }
}
