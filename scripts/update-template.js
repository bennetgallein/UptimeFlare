#!/usr/bin/env node

/**
 * Update the GitHub issue template with actual monitor IDs from uptime.config.ts
 * This script reads the uptime config and updates the maintenance issue template
 * to include the correct monitor options.
 */

const fs = require('fs')
const path = require('path')

function extractMonitorIds() {
  try {
    const configPath = path.join(__dirname, '..', 'uptime.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf8')

    const monitors = []

    // Use multiple regex searches to find all id/name pairs
    const idMatches = [...configContent.matchAll(/id:\s*['"`]([^'"`]+)['"`]/g)]
    const nameMatches = [...configContent.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g)]

    // Filter to only include monitors section by checking position
    const monitorsStartPos = configContent.indexOf('monitors: [')

    // Find the matching closing bracket for the monitors array
    let monitorsEndPos = -1
    let bracketCount = 0
    let startSearchPos = monitorsStartPos + 'monitors: ['.length

    for (let i = startSearchPos; i < configContent.length; i++) {
      if (configContent[i] === '[') bracketCount++
      if (configContent[i] === ']') {
        if (bracketCount === 0) {
          monitorsEndPos = i
          break
        }
        bracketCount--
      }
    }

    if (monitorsStartPos === -1 || monitorsEndPos === -1) {
      console.log('⚠️  Could not find monitors array in config')
      return []
    }

    // Filter matches to only those within the monitors array
    const monitorIds = idMatches.filter(
      (match) => match.index > monitorsStartPos && match.index < monitorsEndPos
    )
    const monitorNames = nameMatches.filter(
      (match) => match.index > monitorsStartPos && match.index < monitorsEndPos
    )

    // Pair up ids and names (they should appear in the same order)
    for (let i = 0; i < Math.min(monitorIds.length, monitorNames.length); i++) {
      monitors.push({
        id: monitorIds[i][1],
        name: monitorNames[i][1],
      })
    }

    return monitors
  } catch (error) {
    console.error('❌ Error reading config file:', error.message)
    return []
  }
}

function updateIssueTemplate(monitors) {
  try {
    const templatePath = path.join(__dirname, '..', '.github', 'ISSUE_TEMPLATE', 'maintenance.yml')

    if (!fs.existsSync(templatePath)) {
      console.log('❌ Issue template not found')
      return false
    }

    let templateContent = fs.readFileSync(templatePath, 'utf8')

    // Generate new monitor options
    const monitorOptions = monitors
      .map(
        (monitor) =>
          `        - label: '${monitor.id} - ${monitor.name}'\n          value: '${monitor.id}'`
      )
      .join('\n')

    // Add "All monitors" option
    const allOptions = monitorOptions + `\n        - label: 'All monitors'\n          value: 'all'`

    // Replace the options section
    const optionsRegex = /(options:\s*\n)([\s\S]*?)(\n\n|\n  - type:)/
    const replacement = `$1${allOptions}$3`

    templateContent = templateContent.replace(optionsRegex, replacement)

    // Write back to file
    fs.writeFileSync(templatePath, templateContent, 'utf8')

    return true
  } catch (error) {
    console.error('❌ Error updating template:', error.message)
    return false
  }
}

function main() {
  console.log('🔄 Updating issue template with monitor IDs from config...\n')

  // Extract monitors from config
  const monitors = extractMonitorIds()

  if (monitors.length === 0) {
    console.log('❌ No monitors found in configuration')
    process.exit(1)
  }

  console.log(`✅ Found ${monitors.length} monitors:`)
  monitors.forEach((monitor) => {
    console.log(`   - ${monitor.id}: ${monitor.name}`)
  })

  // Update template
  const success = updateIssueTemplate(monitors)

  if (success) {
    console.log('\n✅ Issue template updated successfully!')
    console.log('\nThe maintenance issue template now includes:')
    monitors.forEach((monitor) => {
      console.log(`   ☑️  ${monitor.id} - ${monitor.name}`)
    })
    console.log('   ☑️  All monitors')

    console.log('\n🎯 Next steps:')
    console.log('1. Commit the updated template to your repository')
    console.log('2. Test by creating a new maintenance issue')
    console.log('3. Verify the monitor options appear correctly')
  } else {
    console.log('\n❌ Failed to update issue template')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { extractMonitorIds, updateIssueTemplate }
