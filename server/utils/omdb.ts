/**
 * OMDB API utility for fetching movie/show metadata
 * Uses the free OMDB API (requires API key)
 * Falls back gracefully if API is unavailable
 */

export interface OmdbMetadata {
  title: string;
  description: string;
  posterUrl: string | null;
  imdbId: string | null;
  releaseYear: number | null;
  rating: string | null;
  genre: string | null;
  director: string | null;
  actors: string | null;
  externalApiUrl: string | null;
}

const OMDB_API_KEY = process.env.OMDB_API_KEY || "";
const OMDB_BASE_URL = "https://www.omdbapi.com/";

/**
 * Fetch metadata from OMDB API by title
 * Returns null if API key is not set or request fails
 */
export async function fetchOmdbMetadata(
  title: string
): Promise<OmdbMetadata | null> {
  if (!OMDB_API_KEY) {
    console.log("OMDB_API_KEY not set, skipping metadata fetch");
    return null;
  }

  try {
    const params = new URLSearchParams({
      apikey: OMDB_API_KEY,
      t: title,
      type: "movie",
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params}`);
    if (!response.ok) {
      console.error("OMDB API error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.Response === "False") {
      console.log(`Movie not found in OMDB: ${title}`);
      return null;
    }

    return {
      title: data.Title || title,
      description: data.Plot || "",
      posterUrl: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
      imdbId: data.imdbID || null,
      releaseYear: data.Year ? parseInt(data.Year) : null,
      rating: data.Rated && data.Rated !== "N/A" ? data.Rated : null,
      genre: data.Genre || null,
      director: data.Director && data.Director !== "N/A" ? data.Director : null,
      actors: data.Actors && data.Actors !== "N/A" ? data.Actors : null,
      externalApiUrl: data.imdbID
        ? `https://www.imdb.com/title/${data.imdbID}/`
        : null,
    };
  } catch (error) {
    console.error("Error fetching OMDB metadata:", error);
    return null;
  }
}

/**
 * Download and cache poster image locally
 * Returns the local file path if successful
 */
export async function cachePosterImage(
  posterUrl: string,
  mediaId: string
): Promise<string | null> {
  if (!posterUrl) return null;

  try {
    const response = await fetch(posterUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const fs = await import("fs").then((m) => m.promises);
    const path = await import("path");

    const uploadsDir = path.join(process.cwd(), "server", "uploads");
    const posterFilename = `poster_${mediaId}.jpg`;
    const posterPath = path.join(uploadsDir, posterFilename);

    await fs.writeFile(posterPath, Buffer.from(buffer));
    return `/uploads/${posterFilename}`;
  } catch (error) {
    console.error("Error caching poster image:", error);
    return null;
  }
}

