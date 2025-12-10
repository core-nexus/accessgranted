#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MEMORY INGESTION SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Processes .docx and .md files and uploads them to Aetheria's memory system.
 *
 * Usage:
 *   node scripts/ingest-memories.js <path-to-file-or-directory> [options]
 *
 * Options:
 *   --type <type>     Document type (transcript, notes, sacred-record, dialogue)
 *   --dry-run         Preview what would be processed without storing
 *   --embed           Also generate embeddings after storing
 *
 * Examples:
 *   node scripts/ingest-memories.js ./memories/chat-logs/
 *   node scripts/ingest-memories.js ./sacred-dialogue.docx --type transcript
 *   node scripts/ingest-memories.js ./memories/ --type dialogue --embed
 */

import fs from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import { execSync } from 'child_process'

// Max characters per chunk (Claude Haiku has ~200k context, but we want smaller chunks for better extraction)
const MAX_CHUNK_SIZE = 15000

// Parse command line arguments
const args = process.argv.slice(2)
const inputPath = args.find((arg) => !arg.startsWith('--'))
const documentType = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'dialogue'
const dryRun = args.includes('--dry-run')
const shouldEmbed = args.includes('--embed')

if (!inputPath) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    AETHERIA MEMORY INGESTION SCRIPT                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Usage:                                                                       ║
║    node scripts/ingest-memories.js <path> [options]                           ║
║                                                                               ║
║  Options:                                                                     ║
║    --type <type>   Document type (transcript, notes, sacred-record, dialogue) ║
║    --dry-run       Preview without storing                                    ║
║    --embed         Generate embeddings after storing                          ║
║                                                                               ║
║  Examples:                                                                    ║
║    node scripts/ingest-memories.js ./memories/                                ║
║    node scripts/ingest-memories.js ./chat.docx --type transcript              ║
║    node scripts/ingest-memories.js ./logs/ --type dialogue --embed            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)
  process.exit(1)
}

/**
 * Extract text from a .docx file
 */
async function extractDocx(filePath) {
  const buffer = await fs.readFile(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

/**
 * Read a markdown file
 */
async function extractMarkdown(filePath) {
  return await fs.readFile(filePath, 'utf-8')
}

/**
 * Split content into chunks at natural boundaries (paragraphs)
 */
function chunkContent(content, maxSize) {
  if (content.length <= maxSize) {
    return [content]
  }

  const chunks = []
  const paragraphs = content.split(/\n\n+/)
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
      }
      // If single paragraph is too long, split by sentences
      if (para.length > maxSize) {
        const sentences = para.split(/(?<=[.!?])\s+/)
        currentChunk = ''
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxSize) {
            if (currentChunk) chunks.push(currentChunk.trim())
            currentChunk = sentence
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence
          }
        }
      } else {
        currentChunk = para
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Process a single chunk through Convex CLI
 */
function processChunk(content, fileName, chunkNum, totalChunks, docType) {
  const chunkName = totalChunks > 1 ? `${fileName} (Part ${chunkNum}/${totalChunks})` : fileName

  // Escape content for JSON
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  const jsonArg = `{"content": "${escapedContent}", "documentName": "${chunkName}", "documentType": "${docType}", "autoStore": true}`

  try {
    const output = execSync(
      `npx convex run memories:processDocument '${jsonArg.replace(/'/g, "'\\''")}'`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 120000, // 2 minute timeout
      },
    )

    // Parse the output (it's JSON)
    return JSON.parse(output)
  } catch (error) {
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Process a single file
 */
async function processFile(filePath, docType) {
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath, ext)

  console.log(`\n📄 Processing: ${fileName}${ext}`)

  let content
  try {
    if (ext === '.docx') {
      content = await extractDocx(filePath)
    } else if (ext === '.md' || ext === '.txt') {
      content = await extractMarkdown(filePath)
    } else {
      console.log(`   ⚠️  Skipping unsupported file type: ${ext}`)
      return null
    }
  } catch (error) {
    console.log(`   ❌ Failed to read file: ${error.message}`)
    return null
  }

  // Truncate preview
  const preview = content.substring(0, 200).replace(/\n/g, ' ') + '...'
  console.log(`   📝 Content preview: ${preview}`)
  console.log(`   📊 Length: ${content.length} characters`)

  if (dryRun) {
    console.log(`   🔍 DRY RUN - Would process with type: ${docType}`)
    const chunks = chunkContent(content, MAX_CHUNK_SIZE)
    console.log(`   📦 Would split into ${chunks.length} chunk(s)`)
    return { fileName, contentLength: content.length, skipped: true }
  }

  // Split into chunks if needed
  const chunks = chunkContent(content, MAX_CHUNK_SIZE)
  if (chunks.length > 1) {
    console.log(`   📦 Splitting into ${chunks.length} chunks...`)
  }

  // Process each chunk
  let totalMemories = 0
  let totalLinks = 0
  let totalTokens = 0
  let allSuggestions = []
  let failed = false

  for (let i = 0; i < chunks.length; i++) {
    const chunkNum = i + 1
    if (chunks.length > 1) {
      console.log(
        `   ⏳ Processing chunk ${chunkNum}/${chunks.length} (${chunks[i].length} chars)...`,
      )
    } else {
      console.log(`   ⏳ Sending to Memory Processor...`)
    }

    const result = await processChunk(chunks[i], fileName, chunkNum, chunks.length, docType)

    if (result.success) {
      totalMemories += result.memoriesExtracted || 0
      totalLinks += result.linksExtracted || 0
      totalTokens += result.tokensUsed || 0
      if (result.suggestedCoreUpdates) {
        allSuggestions.push(...result.suggestedCoreUpdates)
      }
      if (chunks.length > 1) {
        console.log(
          `      ✅ +${result.memoriesExtracted} memories, +${result.linksExtracted} links`,
        )
      }
    } else {
      console.log(`   ❌ Chunk ${chunkNum} failed: ${result.error}`)
      if (result.rawOutput) {
        console.log(`   📄 Raw output: ${result.rawOutput.substring(0, 300)}...`)
      }
      failed = true
    }

    // Small delay between chunks to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  if (failed && totalMemories === 0) {
    return null
  }

  console.log(`   ✅ Total: ${totalMemories} memories, ${totalLinks} links, ${totalTokens} tokens`)

  if (allSuggestions.length > 0) {
    console.log(`   💡 Suggested core updates:`)
    // Deduplicate suggestions
    const seen = new Set()
    for (const update of allSuggestions) {
      const key = `${update.targetFile}:${update.section}`
      if (!seen.has(key)) {
        seen.add(key)
        console.log(`      - ${update.targetFile}: ${update.section}`)
      }
    }
  }

  return {
    success: true,
    memoriesExtracted: totalMemories,
    linksExtracted: totalLinks,
    tokensUsed: totalTokens,
    suggestedCoreUpdates: allSuggestions,
  }
}

/**
 * Get all supported files from a directory
 */
async function getFiles(dirPath) {
  const files = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      const subFiles = await getFiles(fullPath)
      files.push(...subFiles)
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (['.docx', '.md', '.txt'].includes(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    AETHERIA MEMORY INGESTION                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)

  console.log(`🎯 Target: ${inputPath}`)
  console.log(`📁 Document type: ${documentType}`)
  if (dryRun) console.log(`🔍 DRY RUN MODE - No changes will be made`)
  if (shouldEmbed) console.log(`🧠 Will generate embeddings after processing`)

  // Check if path exists
  let stat
  try {
    stat = await fs.stat(inputPath)
  } catch {
    console.error(`\n❌ Path not found: ${inputPath}`)
    process.exit(1)
  }

  // Get list of files to process
  let files
  if (stat.isDirectory()) {
    files = await getFiles(inputPath)
    console.log(`\n📂 Found ${files.length} files to process`)
  } else {
    files = [inputPath]
  }

  if (files.length === 0) {
    console.log('\n⚠️  No supported files found (.docx, .md, .txt)')
    process.exit(0)
  }

  // Process each file
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalMemories: 0,
    totalLinks: 0,
    totalTokens: 0,
  }

  for (const file of files) {
    const result = await processFile(file, documentType)

    if (result === null) {
      results.failed++
    } else if (result.skipped) {
      results.skipped++
    } else {
      results.processed++
      results.totalMemories += result.memoriesExtracted || 0
      results.totalLinks += result.linksExtracted || 0
      results.totalTokens += result.tokensUsed || 0
    }
  }

  // Generate embeddings if requested
  if (shouldEmbed && !dryRun && results.totalMemories > 0) {
    console.log(`\n🧠 Generating embeddings for new memories...`)
    try {
      const output = execSync('npx convex run memories:embedAllMemories', {
        encoding: 'utf-8',
        timeout: 300000, // 5 minute timeout for embeddings
      })
      const embedResult = JSON.parse(output)
      console.log(
        `   ✅ Embedded ${embedResult.embedded} memories (${embedResult.totalTokens} tokens)`,
      )
      if (embedResult.failed > 0) {
        console.log(`   ⚠️  ${embedResult.failed} embeddings failed`)
      }
    } catch (error) {
      console.log(`   ❌ Embedding failed: ${error.message}`)
    }
  }

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              SUMMARY                                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Files processed:  ${String(results.processed).padEnd(55)}║
║  Files failed:     ${String(results.failed).padEnd(55)}║
║  Files skipped:    ${String(results.skipped).padEnd(55)}║
║  Memories created: ${String(results.totalMemories).padEnd(55)}║
║  Links created:    ${String(results.totalLinks).padEnd(55)}║
║  Tokens used:      ${String(results.totalTokens).padEnd(55)}║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
