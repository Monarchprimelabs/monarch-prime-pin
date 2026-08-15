import WidgetKit
import SwiftUI

// All display strings are written — already localized — by the app via
// ExtensionStorage (@bacons/apple-targets) into the shared app group, so the
// widget itself contains no user data logic and no compound names.
private let appGroup = "group.com.monarchprime.pin"

struct MonarchEntry: TimelineEntry {
  let date: Date
  let big: String
  let line1: String
  let line2: String
}

private func readEntry() -> MonarchEntry {
  let defaults = UserDefaults(suiteName: appGroup)
  return MonarchEntry(
    date: Date(),
    big: defaults?.string(forKey: "widget_big") ?? "—",
    line1: defaults?.string(forKey: "widget_line1") ?? "",
    line2: defaults?.string(forKey: "widget_line2") ?? ""
  )
}

struct MonarchProvider: TimelineProvider {
  func placeholder(in context: Context) -> MonarchEntry { readEntry() }

  func getSnapshot(in context: Context, completion: @escaping (MonarchEntry) -> Void) {
    completion(readEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MonarchEntry>) -> Void) {
    // The app pushes fresh data on every dashboard load; the hourly refresh
    // only keeps the "days since" number honest across midnight.
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
    completion(Timeline(entries: [readEntry()], policy: .after(next)))
  }
}

struct MonarchWidgetView: View {
  var entry: MonarchEntry

  private let accent = Color(red: 1.0, green: 0.55, blue: 0.0)
  private let muted = Color(red: 0.48, green: 0.56, blue: 0.67)

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text("MONARCH PRIME PIN")
        .font(.system(size: 8.5, weight: .heavy))
        .kerning(1.1)
        .foregroundColor(accent)
      Spacer(minLength: 0)
      Text(entry.big)
        .font(.system(size: 34, weight: .heavy, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.5)
        .lineLimit(1)
      Text(entry.line1)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(muted)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
      Text(entry.line2)
        .font(.system(size: 11))
        .foregroundColor(muted)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) {
      Color(red: 0.02, green: 0.031, blue: 0.063)
    }
  }
}

@main
struct MonarchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MonarchWidget", provider: MonarchProvider()) { entry in
      MonarchWidgetView(entry: entry)
    }
    .configurationDisplayName("Monarch Prime Pin")
    .description("Days since your last logged record.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
