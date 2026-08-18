import WidgetKit
import SwiftUI

// The app writes raw record timestamps plus pre-localized labels into the
// shared app group (src/lib/widget.ts). The widget computes "days since"
// and the rolling 7-day count HERE, at timeline time, so the numbers keep
// moving after the app is closed. It contains no user data logic beyond
// that math and no compound names.
private let appGroup = "group.com.monarchprime.pin"

struct MonarchEntry: TimelineEntry {
  let date: Date
  let big: String
  let daysLabel: String
  let totalLine: String
  let last7: String
  let last7Label: String
}

private struct Snapshot {
  let lastRecord: Date?
  let recent: [Date]
  let wordToday: String
  let daysLabel: String
  let totalLine: String
  let last7Label: String

  static func read() -> Snapshot {
    let defaults = UserDefaults(suiteName: appGroup)
    func epoch(_ raw: String?) -> Date? {
      guard let raw, let seconds = Double(raw), seconds > 0 else { return nil }
      return Date(timeIntervalSince1970: seconds)
    }
    let recentRaw = defaults?.string(forKey: "widget_recent_ts") ?? ""
    let recent = recentRaw.split(separator: ",").compactMap { epoch(String($0)) }
    return Snapshot(
      lastRecord: epoch(defaults?.string(forKey: "widget_last_ts")),
      recent: recent,
      wordToday: defaults?.string(forKey: "widget_word_today") ?? "Today",
      daysLabel: defaults?.string(forKey: "widget_label_days") ?? "days since last record",
      totalLine: defaults?.string(forKey: "widget_line_total") ?? "",
      last7Label: defaults?.string(forKey: "widget_label_last7") ?? "last 7 days"
    )
  }

  func entry(at date: Date) -> MonarchEntry {
    var big = "—"
    if let lastRecord {
      let cal = Calendar.current
      let days = cal.dateComponents(
        [.day],
        from: cal.startOfDay(for: lastRecord),
        to: cal.startOfDay(for: date)
      ).day ?? 0
      big = days <= 0 ? wordToday : String(days)
    }
    let windowStart = date.addingTimeInterval(-7 * 86400)
    let last7 = recent.filter { $0 >= windowStart && $0 <= date }.count
    return MonarchEntry(
      date: date,
      big: big,
      daysLabel: daysLabel,
      totalLine: totalLine,
      last7: String(last7),
      last7Label: last7Label
    )
  }
}

struct MonarchProvider: TimelineProvider {
  func placeholder(in context: Context) -> MonarchEntry { Snapshot.read().entry(at: Date()) }

  func getSnapshot(in context: Context, completion: @escaping (MonarchEntry) -> Void) {
    completion(Snapshot.read().entry(at: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MonarchEntry>) -> Void) {
    // "Days since" only changes at midnight, so serve today's entry plus one
    // pre-computed for the stroke of midnight, then refresh for the next day.
    let snapshot = Snapshot.read()
    let now = Date()
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86400)
    let entries = [snapshot.entry(at: now), snapshot.entry(at: midnight)]
    completion(Timeline(entries: entries, policy: .after(midnight.addingTimeInterval(60))))
  }
}

private let accent = Color(red: 1.0, green: 0.55, blue: 0.0)
private let muted = Color(red: 0.48, green: 0.56, blue: 0.67)
private let bg = Color(red: 0.02, green: 0.031, blue: 0.063)

struct MonarchWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: MonarchEntry

  var body: some View {
    Group {
      if family == .systemMedium { medium } else { small }
    }
    .containerBackground(for: .widget) { bg }
  }

  private var header: some View {
    Text("MONARCH PRIME PIN")
      .font(.system(size: 8.5, weight: .heavy))
      .kerning(1.1)
      .foregroundColor(accent)
  }

  private var daysColumn: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(entry.big)
        .font(.system(size: 34, weight: .heavy, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.5)
        .lineLimit(1)
      Text(entry.daysLabel)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(muted)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 3) {
      header
      Spacer(minLength: 0)
      daysColumn
      Text(entry.totalLine)
        .font(.system(size: 11))
        .foregroundColor(muted)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var medium: some View {
    VStack(alignment: .leading, spacing: 3) {
      header
      Spacer(minLength: 0)
      HStack(alignment: .bottom, spacing: 0) {
        daysColumn
          .frame(maxWidth: .infinity, alignment: .leading)
        Rectangle()
          .fill(muted.opacity(0.25))
          .frame(width: 1, height: 44)
          .padding(.horizontal, 14)
        VStack(alignment: .leading, spacing: 3) {
          Text(entry.last7)
            .font(.system(size: 34, weight: .heavy, design: .rounded))
            .foregroundColor(.white)
            .minimumScaleFactor(0.5)
            .lineLimit(1)
          Text(entry.last7Label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(muted)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      Spacer(minLength: 0)
      Text(entry.totalLine)
        .font(.system(size: 11))
        .foregroundColor(muted)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
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
