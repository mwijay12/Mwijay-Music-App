package mwijay.music.app

import android.content.ContentUris
import android.content.Context
import android.provider.MediaStore
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.io.File
import java.io.FileOutputStream
import android.media.MediaMetadataRetriever
import android.util.Log

class MediaScanner(private val context: Context) {

    private fun getArtworkCachePath(albumId: Long, filePath: String, id: Long): String {
        try {
            val cacheDir = context.cacheDir
            val cacheFile = File(cacheDir, "album_art_${albumId}.jpg")
            if (cacheFile.exists() && cacheFile.length() > 0) {
                return cacheFile.absolutePath
            }

            // Try 1: Load from MediaStore album art URI
            val artworkUri = ContentUris.withAppendedId(
                android.net.Uri.parse("content://media/external/audio/albumart"),
                albumId
            )
            try {
                context.contentResolver.openInputStream(artworkUri)?.use { inputStream ->
                    FileOutputStream(cacheFile).use { outputStream ->
                        inputStream.copyTo(outputStream)
                    }
                }
                if (cacheFile.exists() && cacheFile.length() > 0) {
                    return cacheFile.absolutePath
                }
            } catch (e: Exception) {
                // Ignore and try metadata retriever
            }

            // Try 2: Extract embedded artwork from the audio file itself
            if (filePath.isNotEmpty()) {
                val file = File(filePath)
                if (file.exists()) {
                    val retriever = MediaMetadataRetriever()
                    try {
                        retriever.setDataSource(filePath)
                        val artBytes = retriever.embeddedPicture
                        if (artBytes != null) {
                            val embedCacheFile = File(cacheDir, "embed_art_${id}.jpg")
                            FileOutputStream(embedCacheFile).use { it.write(artBytes) }
                            return embedCacheFile.absolutePath
                        }
                    } catch (e: Exception) {
                        // Ignore
                    } finally {
                        try { retriever.release() } catch (ex: Exception) {}
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("MediaScanner", "Error caching artwork", e)
        }
        return ""
    }

    fun scanAudio(): JSArray {
        val audioList = JSArray()
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DATE_ADDED
        )

        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"

        context.contentResolver.query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            null,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
            val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
            val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Unknown Title"
                val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
                val album = cursor.getString(albumColumn) ?: "Unknown Album"
                val duration = cursor.getLong(durationColumn)
                val data = cursor.getString(dataColumn) ?: ""
                val albumId = cursor.getLong(albumIdColumn)
                val dateAdded = cursor.getLong(dateColumn)

                val contentUri = ContentUris.withAppendedId(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    id
                )

                // Get cache file path for artwork
                val cachedArtworkPath = getArtworkCachePath(albumId, data, id)

                val audioItem = JSObject().apply {
                    put("id", id)
                    put("title", title)
                    put("artist", artist)
                    put("album", album)
                    put("duration", duration)
                    put("path", data)
                    put("uri", contentUri.toString())
                    put("artwork", cachedArtworkPath) // Pass cache absolute path
                    put("dateAdded", dateAdded)
                    put("type", "audio")
                }
                audioList.put(audioItem)
            }
        }
        return audioList
    }

    fun scanVideo(): JSArray {
        val videoList = JSArray()
        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.TITLE,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.DATA,
            MediaStore.Video.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.DATE_ADDED
        )

        val sortOrder = "${MediaStore.Video.Media.DATE_ADDED} DESC"

        context.contentResolver.query(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            projection,
            null,
            null,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.TITLE)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATA)
            val bucketColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.BUCKET_DISPLAY_NAME)
            val widthColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.WIDTH)
            val heightColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.HEIGHT)
            val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_ADDED)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Unknown Video"
                val duration = cursor.getLong(durationColumn)
                val data = cursor.getString(dataColumn) ?: ""
                val bucket = cursor.getString(bucketColumn) ?: "Local Device"
                val width = cursor.getInt(widthColumn)
                val height = cursor.getInt(heightColumn)
                val dateAdded = cursor.getLong(dateColumn)

                val contentUri = ContentUris.withAppendedId(
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                    id
                )

                val isReel = if (width > 0 && height > 0) {
                    (width.toFloat() / height.toFloat()) < 0.75f
                } else {
                    false
                }

                val videoItem = JSObject().apply {
                    put("id", id)
                    put("title", title)
                    put("artist", bucket) // Using bucket as artist/category for videos
                    put("duration", duration)
                    put("path", data)
                    put("uri", contentUri.toString())
                    put("type", if (isReel) "reel" else "video")
                    put("isReel", isReel)
                    put("width", width)
                    put("height", height)
                    put("dateAdded", dateAdded)
                }
                videoList.put(videoItem)
            }
        }
        return videoList
    }
}
