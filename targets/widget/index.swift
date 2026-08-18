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
  let streak: String
  let streakLabel: String
}

private struct Snapshot {
  let lastRecord: Date?
  let recent: [Date]
  let wordToday: String
  let daysLabel: String
  let totalLine: String
  let last7Label: String
  let streakBase: Int
  let streakLabel: String

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
      last7Label: defaults?.string(forKey: "widget_label_last7") ?? "last 7 days",
      streakBase: Int(defaults?.string(forKey: "widget_streak_base") ?? "") ?? 0,
      streakLabel: defaults?.string(forKey: "widget_label_streak") ?? "Day Streak"
    )
  }

  func entry(at date: Date) -> MonarchEntry {
    var big = "—"
    // Same grace rule as the dashboard: not having logged YET today keeps
    // the streak alive; it zeroes only once a full day passes unlogged.
    var streak = 0
    if let lastRecord {
      let cal = Calendar.current
      let days = cal.dateComponents(
        [.day],
        from: cal.startOfDay(for: lastRecord),
        to: cal.startOfDay(for: date)
      ).day ?? 0
      big = days <= 0 ? wordToday : String(days)
      streak = days <= 1 ? streakBase : 0
    }
    let windowStart = date.addingTimeInterval(-7 * 86400)
    let last7 = recent.filter { $0 >= windowStart && $0 <= date }.count
    return MonarchEntry(
      date: date,
      big: big,
      daysLabel: daysLabel,
      totalLine: totalLine,
      last7: String(last7),
      last7Label: last7Label,
      streak: String(streak),
      streakLabel: streakLabel
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
    .widgetURL(URL(string: "monarchpin://log"))
    .containerBackground(for: .widget) { bg }
  }

  private var header: some View {
    Text("MONARCH PRIME PIN")
      .font(.system(size: 8.5, weight: .heavy))
      .kerning(1.1)
      .foregroundColor(accent)
  }

  private func statColumn(_ value: String, _ label: String, size: CGFloat = 34) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(value)
        .font(.system(size: size, weight: .heavy, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.5)
        .lineLimit(1)
      Text(label)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(muted)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
  }

  private var divider: some View {
    Rectangle()
      .fill(muted.opacity(0.25))
      .frame(width: 1, height: 40)
      .padding(.horizontal, 10)
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 3) {
      header
      Spacer(minLength: 0)
      statColumn(entry.big, entry.daysLabel)
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
      HStack {
        header
        Spacer()
        Image(systemName: "plus.circle.fill")
          .font(.system(size: 20))
          .foregroundColor(accent)
      }
      Spacer(minLength: 0)
      HStack(alignment: .bottom, spacing: 0) {
        statColumn(entry.big, entry.daysLabel, size: 30)
          .frame(maxWidth: .infinity, alignment: .leading)
        divider
        statColumn(entry.streak, entry.streakLabel, size: 30)
          .frame(maxWidth: .infinity, alignment: .leading)
        divider
        statColumn(entry.last7, entry.last7Label, size: 30)
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
