import HomeTabBar from "@/components/HomeTabBar";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  Check,
  CheckCircle,
  Flame,
  LifeBuoy,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Interfaces
interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}

interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  date: string;
  status: string;
  statusColor: string;
  isLast?: boolean;
}

interface AchievementProps {
  title: string;
  desc: string;
  progress: number; // 0 to 1
  isUnlocked: boolean;
  icon: React.ReactNode;
}

export default function ResponderDashboard() {
  // State for Simulator Tool (Good Standing vs Warning mode)
  const [isWarningMode, setIsWarningMode] = useState(false);

  // States for Emergency Readiness checklist
  const [readiness, setReadiness] = useState({
    locationSharing: true,
    contactsConfigured: true,
    notificationsEnabled: true,
    emergencyMode: false,
  });

  // Dynamic values based on simulator mode
  const trustScore = isWarningMode ? 74 : 98;
  const communityRank = isWarningMode ? "#48" : "#12";
  const currentBadge = isWarningMode ? "Silver Responder" : "Campus Hero";
  const safetyStanding = isWarningMode ? "Warning" : "Good Standing";

  // Stat values based on mode
  const stats = {
    filed: isWarningMode ? 8 : 4,
    responded: isWarningMode ? 5 : 12,
    contacts: readiness.contactsConfigured ? 4 : 0,
    points: isWarningMode ? 150 : 480,
    avgResponseTime: isWarningMode ? "8.5m" : "4.2m",
    monthlyActivity: isWarningMode ? 9 : 16,
  };

  const handleContactCall = (name: string) => {
    Alert.alert(
      "Emergency Call",
      `Initiating direct emergency call to ${name}...`,
    );
  };

  const handleContactChat = (name: string) => {
    Alert.alert(
      "Emergency Chat",
      `Opening rapid secure chat channel with ${name}...`,
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header bar (no scrolling) */}
      <HomeTabBar pageTitle="profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Simulator Toggle Panel */}
        <View style={styles.simulatorCard}>
          <View style={styles.simulatorHeader}>
            <Activity size={18} color={ResQColors.teal} />
            <Text style={styles.simulatorTitle}>
              Interactive Simulator Tool
            </Text>
          </View>
          <Text style={styles.simulatorDesc}>
            Toggle the switch below to preview how the screen and security
            alerts behave under different safety standings.
          </Text>
          <View style={styles.simulatorToggleRow}>
            <Text style={styles.simulatorToggleLabel}>
              Simulate Account Warning (False Reports Active)
            </Text>
            <Switch
              value={isWarningMode}
              onValueChange={setIsWarningMode}
              trackColor={{ false: "#E5E7EB", true: ResQColors.amberBorder }}
              thumbColor={isWarningMode ? ResQColors.amber : "#9CA3AF"}
            />
          </View>
        </View>

        {/* User Standing & Trust Score Card */}
        <View style={styles.dashboardHeaderCard}>
          <View style={styles.headerTopSection}>
            {/* Left side: Badge & Standing info */}
            <View style={styles.badgeInfoColumn}>
              <Text style={styles.standingLabel}>CURRENT STATUS</Text>

              {/* Safety Standing Indicator Badge */}
              <View
                style={[
                  styles.statusBadge,
                  isWarningMode
                    ? styles.statusBadgeWarning
                    : styles.statusBadgeGood,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isWarningMode
                        ? ResQColors.amber
                        : ResQColors.teal,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isWarningMode
                        ? ResQColors.amberDark
                        : ResQColors.tealDark,
                    },
                  ]}
                >
                  {safetyStanding}
                </Text>
              </View>

              <Text style={styles.userBadgeName}>{currentBadge}</Text>
              <Text style={styles.rankText}>
                Rank <Text style={styles.rankHighlight}>{communityRank}</Text>{" "}
                on Campus
              </Text>
            </View>

            {/* Right side: Trust Score Circle */}
            <View style={styles.trustScoreColumn}>
              <View style={styles.trustProgressWrapper}>
                {/* Visual Circle Indicator Background */}
                <View
                  style={[
                    styles.trustCircle,
                    {
                      borderColor: isWarningMode
                        ? ResQColors.amberBorder
                        : ResQColors.teal,
                    },
                  ]}
                >
                  <Text style={styles.trustScoreNumber}>{trustScore}%</Text>
                  <Text style={styles.trustScoreLabel}>Trust</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trust Score Progress Track Description */}
          <View style={styles.trustDescriptionRow}>
            <Text style={styles.trustDescriptionText}>
              {isWarningMode
                ? "Your trust score has decreased due to confirmed false reports. Keep responding accurately to rebuild trust."
                : "Excellent trust rating! Your rapid alerts and contributions are highly valued by campus security."}
            </Text>
          </View>
        </View>

        {/* Conduct Accountability Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Conduct</Text>
        </View>
        <View
          style={[
            styles.conductCard,
            isWarningMode ? styles.conductCardWarning : styles.conductCardGood,
          ]}
        >
          {isWarningMode ? (
            <View style={styles.conductRow}>
              <View style={styles.conductIconContainerWarning}>
                <AlertTriangle size={24} color={ResQColors.amber} />
              </View>
              <View style={styles.conductTextContainer}>
                <Text style={styles.conductTitleWarning}>
                  Accountability Warning
                </Text>
                <Text style={styles.conductBodyWarning}>
                  ⚠️ You have submitted 2 confirmed false emergency reports.
                  Repeated misuse may reduce your trust score, temporarily
                  suspend reporting privileges, or trigger administrative
                  review.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.conductRow}>
              <View style={styles.conductIconContainerGood}>
                <CheckCircle size={24} color={ResQColors.teal} />
              </View>
              <View style={styles.conductTextContainer}>
                <Text style={styles.conductTitleGood}>Good Standing</Text>
                <Text style={styles.conductBodyGood}>
                  ✅ You are in good standing. Thank you for helping keep the
                  campus safe.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Emergency Readiness Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency Readiness</Text>
          <Text style={styles.sectionSubtitle}>
            Configure your active devices for optimal campus safety response.
          </Text>
        </View>
        <View style={styles.readinessCard}>
          {/* Location Sharing Row */}
          <View style={styles.readinessRow}>
            <View style={styles.readinessLeft}>
              <View
                style={[
                  styles.readinessIconWrapper,
                  { backgroundColor: "#E6F1FB" },
                ]}
              >
                <MapPin size={20} color="#0C447C" />
              </View>
              <View>
                <Text style={styles.readinessLabelText}>Location Sharing</Text>
                <Text style={styles.readinessSublabelText}>
                  {readiness.locationSharing
                    ? "Active (High Accuracy)"
                    : "Disabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={readiness.locationSharing}
              onValueChange={(val) =>
                setReadiness((prev) => ({ ...prev, locationSharing: val }))
              }
              trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
              thumbColor={readiness.locationSharing ? "#2563EB" : "#9CA3AF"}
            />
          </View>

          {/* Divider */}
          <View style={styles.readinessDivider} />

          {/* Trusted Contacts Configured Row */}
          <View style={styles.readinessRow}>
            <View style={styles.readinessLeft}>
              <View
                style={[
                  styles.readinessIconWrapper,
                  { backgroundColor: ResQColors.tealLight },
                ]}
              >
                <Users size={20} color={ResQColors.tealDark} />
              </View>
              <View>
                <Text style={styles.readinessLabelText}>Trusted Contacts</Text>
                <Text style={styles.readinessSublabelText}>
                  {readiness.contactsConfigured
                    ? "4 Contacts Linked"
                    : "No Contacts Configured"}
                </Text>
              </View>
            </View>
            <Switch
              value={readiness.contactsConfigured}
              onValueChange={(val) =>
                setReadiness((prev) => ({ ...prev, contactsConfigured: val }))
              }
              trackColor={{ false: "#E5E7EB", true: ResQColors.tealLight }}
              thumbColor={
                readiness.contactsConfigured ? ResQColors.teal : "#9CA3AF"
              }
            />
          </View>

          {/* Divider */}
          <View style={styles.readinessDivider} />

          {/* Notifications Row */}
          <View style={styles.readinessRow}>
            <View style={styles.readinessLeft}>
              <View
                style={[
                  styles.readinessIconWrapper,
                  { backgroundColor: "#FAF5FF" },
                ]}
              >
                <Bell size={20} color="#6B21A8" />
              </View>
              <View>
                <Text style={styles.readinessLabelText}>Urgent Alerts</Text>
                <Text style={styles.readinessSublabelText}>
                  {readiness.notificationsEnabled
                    ? "Enabled (Sound & Vibration)"
                    : "Muted"}
                </Text>
              </View>
            </View>
            <Switch
              value={readiness.notificationsEnabled}
              onValueChange={(val) =>
                setReadiness((prev) => ({ ...prev, notificationsEnabled: val }))
              }
              trackColor={{ false: "#E5E7EB", true: "#D8B4FE" }}
              thumbColor={
                readiness.notificationsEnabled ? "#7C3AED" : "#9CA3AF"
              }
            />
          </View>

          {/* Divider */}
          <View style={styles.readinessDivider} />

          {/* Emergency Mode Row */}
          <View style={styles.readinessRow}>
            <View style={styles.readinessLeft}>
              <View
                style={[
                  styles.readinessIconWrapper,
                  { backgroundColor: ResQColors.redLight },
                ]}
              >
                <Flame size={20} color={ResQColors.redDark} />
              </View>
              <View>
                <Text style={styles.readinessLabelText}>
                  Emergency Broadcast Mode
                </Text>
                <Text style={styles.readinessSublabelText}>
                  {readiness.emergencyMode
                    ? "🚨 ACTIVE SOS BROADCASTING"
                    : "Standby"}
                </Text>
              </View>
            </View>
            <Switch
              value={readiness.emergencyMode}
              onValueChange={(val) =>
                setReadiness((prev) => ({ ...prev, emergencyMode: val }))
              }
              trackColor={{ false: "#E5E7EB", true: ResQColors.redBorder }}
              thumbColor={readiness.emergencyMode ? ResQColors.red : "#9CA3AF"}
            />
          </View>
        </View>

        {/* Statistics Grid Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contribution Statistics</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<ShieldAlert size={20} color={ResQColors.red} />}
            value={stats.filed}
            label="Total Filed"
            color={ResQColors.red}
            bgColor={ResQColors.redLight}
          />
          <StatCard
            icon={<LifeBuoy size={20} color={ResQColors.teal} />}
            value={stats.responded}
            label="Responded To"
            color={ResQColors.teal}
            bgColor={ResQColors.tealLight}
          />
          <StatCard
            icon={<Users size={20} color="#2563EB" />}
            value={stats.contacts}
            label="Trusted Contacts"
            color="#2563EB"
            bgColor="#E6F1FB"
          />
          <StatCard
            icon={<Trophy size={20} color={ResQColors.amber} />}
            value={stats.points}
            label="Points Earned"
            color={ResQColors.amberDark}
            bgColor={ResQColors.amberLight}
          />
          <StatCard
            icon={<Zap size={20} color="#7C3AED" />}
            value={stats.avgResponseTime}
            label="Avg Response"
            color="#7C3AED"
            bgColor="#FAF5FF"
          />
          <StatCard
            icon={<Activity size={20} color="#0891B2" />}
            value={stats.monthlyActivity}
            label="Monthly Activity"
            color="#0891B2"
            bgColor="#ECFEFF"
          />
        </View>

        {/* Achievements / Milestones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Achievements & Milestones</Text>
        </View>
        <View style={styles.achievementsCard}>
          <AchievementItem
            title="First Responder"
            desc="Helped resolve your first campus emergency alert"
            progress={1.0}
            isUnlocked={true}
            icon={<ShieldCheck size={22} color={ResQColors.teal} />}
          />
          <View style={styles.achievementDivider} />
          <AchievementItem
            title="Campus Hero"
            desc="Maintain a trust score above 90% for 30 consecutive days"
            progress={isWarningMode ? 0.3 : 0.9}
            isUnlocked={!isWarningMode}
            icon={<Award size={22} color={ResQColors.amber} />}
          />
          <View style={styles.achievementDivider} />
          <AchievementItem
            title="10 Successful Responses"
            desc="Reach 10 responses to campus security dispatch calls"
            progress={stats.responded >= 10 ? 1.0 : stats.responded / 10}
            isUnlocked={stats.responded >= 10}
            icon={<Trophy size={22} color="#8B5CF6" />}
          />
          <View style={styles.achievementDivider} />
          <AchievementItem
            title="Trusted Community Member"
            desc="Verify student identity credentials with campus safety office"
            progress={1.0}
            isUnlocked={true}
            icon={<CheckCircle size={22} color="#06B6D4" />}
          />
        </View>

        {/* Recent Activity Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity Timeline</Text>
        </View>
        <View style={styles.timelineCard}>
          {isWarningMode ? (
            <>
              <ActivityItem
                icon={<AlertTriangle size={16} color={ResQColors.amber} />}
                title="Confirmed false report warning flagged"
                date="2 days ago • Library Car Park"
                status="Flagged"
                statusColor={ResQColors.amber}
              />
              <ActivityItem
                icon={<LifeBuoy size={16} color={ResQColors.teal} />}
                title="Responded to medical emergency"
                date="Yesterday • Science Block"
                status="Completed"
                statusColor={ResQColors.teal}
              />
              <ActivityItem
                icon={<ShieldAlert size={16} color={ResQColors.red} />}
                title="Filed theft report"
                date="3 days ago • Pharmacy Block"
                status="Resolved"
                statusColor="#3B82F6"
              />
              <ActivityItem
                icon={<AlertTriangle size={16} color={ResQColors.amber} />}
                title="Confirmed false report warning flagged"
                date="1 week ago • Republic Hall"
                status="Flagged"
                statusColor={ResQColors.amber}
                isLast={true}
              />
            </>
          ) : (
            <>
              <ActivityItem
                icon={<LifeBuoy size={16} color={ResQColors.teal} />}
                title="Responded to medical emergency"
                date="Yesterday • Science Block"
                status="Completed"
                statusColor={ResQColors.teal}
              />
              <ActivityItem
                icon={<ShieldAlert size={16} color={ResQColors.red} />}
                title="Filed theft report"
                date="3 days ago • Pharmacy Block"
                status="Resolved"
                statusColor="#3B82F6"
              />
              <ActivityItem
                icon={<UserPlusIcon size={16} color="#8B5CF6" />}
                title="Added trusted contact: Alex Tan"
                date="5 days ago • Resident Hub"
                status="Linked"
                statusColor="#8B5CF6"
              />
              <ActivityItem
                icon={<CheckCircle size={16} color={ResQColors.teal} />}
                title="Marked emergency incident #144 as resolved"
                date="1 week ago • Food Court"
                status="Completed"
                statusColor={ResQColors.teal}
                isLast={true}
              />
            </>
          )}
        </View>

        {/* Footer padding */}
        <View style={styles.footerSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Subcomponents
function StatCard({ icon, value, label, color, bgColor }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
}

function ActivityItem({
  icon,
  title,
  date,
  status,
  statusColor,
  isLast = false,
}: ActivityItemProps) {
  return (
    <View style={styles.activityRow}>
      {/* Visual Timeline line and dot */}
      <View style={styles.timelineLeftColumn}>
        <View style={[styles.timelineDot, { backgroundColor: statusColor }]}>
          {icon}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.timelineRightColumn}>
        <View style={styles.activityTextRow}>
          <Text style={styles.activityTitle}>{title}</Text>
          <View
            style={[
              styles.activityStatusTag,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Text style={[styles.activityStatusText, { color: statusColor }]}>
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.activityDate}>{date}</Text>
      </View>
    </View>
  );
}

function AchievementItem({
  title,
  desc,
  progress,
  isUnlocked,
  icon,
}: AchievementProps) {
  return (
    <View style={styles.achievementRowItem}>
      <View
        style={[
          styles.achievementIconBox,
          { backgroundColor: isUnlocked ? "#F3F4F6" : "#E5E7EB" },
          !isUnlocked && { opacity: 0.5 },
        ]}
      >
        {icon}
      </View>
      <View style={styles.achievementContentBox}>
        <View style={styles.achievementTitleRow}>
          <Text
            style={[
              styles.achievementTitleText,
              !isUnlocked && { color: "#6B7280" },
            ]}
          >
            {title}
          </Text>
          {isUnlocked ? (
            <View style={styles.unlockedBadge}>
              <Check size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          ) : (
            <Text style={styles.lockedTextLabel}>In Progress</Text>
          )}
        </View>
        <Text style={styles.achievementDescText}>{desc}</Text>

        {/* Milestone Progress Bar */}
        <View style={styles.milestoneProgressOuter}>
          <View
            style={[
              styles.milestoneProgressInner,
              {
                width: `${progress * 100}%`,
                backgroundColor: isUnlocked
                  ? ResQColors.teal
                  : progress > 0.5
                    ? ResQColors.amber
                    : "#6B7280",
              },
            ]}
          />
        </View>
        <Text style={styles.progressPercentText}>
          {Math.round(progress * 100)}% Complete
        </Text>
      </View>
    </View>
  );
}

// Minor customized icons
function UserPlusIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ position: "relative" }}>
      <Users size={size} color={color} />
    </View>
  );
}

// Component Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // Light grey background
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  simulatorCard: {
    marginTop: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
  },
  simulatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  simulatorTitle: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: "#1E40AF",
  },
  simulatorDesc: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#1E3A8A",
    lineHeight: 16,
  },
  simulatorToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  simulatorToggleLabel: {
    fontSize: 11.5,
    fontFamily: typography.medium,
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  dashboardHeaderCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeInfoColumn: {
    flex: 1,
    justifyContent: "center",
  },
  standingLabel: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
  },
  statusBadgeGood: {
    backgroundColor: ResQColors.tealLight,
    borderColor: ResQColors.teal,
  },
  statusBadgeWarning: {
    backgroundColor: ResQColors.amberLight,
    borderColor: ResQColors.amberBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.semibold,
  },
  userBadgeName: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginTop: 8,
  },
  rankText: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  rankHighlight: {
    fontFamily: typography.semibold,
    color: Colors.light.text,
  },
  trustScoreColumn: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 12,
  },
  trustProgressWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  trustCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  trustScoreNumber: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  trustScoreLabel: {
    fontSize: 9,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    marginTop: -2,
  },
  trustDescriptionRow: {
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    marginTop: 14,
    paddingTop: 12,
  },
  trustDescriptionText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    lineHeight: 17,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  conductCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  conductCardGood: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  conductCardWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  conductRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  conductIconContainerGood: {
    marginTop: 2,
  },
  conductIconContainerWarning: {
    marginTop: 2,
  },
  conductTextContainer: {
    flex: 1,
  },
  conductTitleGood: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: "#166534",
  },
  conductTitleWarning: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: "#92400E",
  },
  conductBodyGood: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#166534",
    lineHeight: 18,
    marginTop: 2,
  },
  conductBodyWarning: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#92400E",
    lineHeight: 18,
    marginTop: 2,
  },
  readinessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readinessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  readinessLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readinessIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessLabelText: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: Colors.light.text,
  },
  readinessSublabelText: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  readinessDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    width: "48%", // 2-column layout with gap
    alignItems: "flex-start",
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  achievementsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  achievementRowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 4,
  },
  achievementIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  achievementContentBox: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  achievementTitleText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  unlockedBadge: {
    backgroundColor: ResQColors.teal,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTextLabel: {
    fontSize: 10.5,
    fontFamily: typography.semibold,
    color: ResQColors.amberDark,
    backgroundColor: ResQColors.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  achievementDescText: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  milestoneProgressOuter: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  milestoneProgressInner: {
    height: "100%",
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 9.5,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  achievementDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineLeftColumn: {
    alignItems: "center",
    marginRight: 12,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    backgroundColor: "#E5E7EB",
    flexGrow: 1,
    height: 48,
    marginTop: 2,
    marginBottom: 2,
  },
  timelineRightColumn: {
    flex: 1,
    paddingBottom: 20,
  },
  activityTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activityTitle: {
    fontSize: 13.5,
    fontFamily: typography.bold,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  activityStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityStatusText: {
    fontSize: 9.5,
    fontFamily: typography.bold,
  },
  activityDate: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  footerSpacing: {
    height: 24,
  },
});
1;
