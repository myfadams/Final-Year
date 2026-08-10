import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import DropdownMenu from "@/components/DropdownMenu";

import {
  getCurrentUser,
  signInUser,
  signUpUser,
  updateUserVerification,
  uploadStudentIdCard,
} from "@/backend/auth";
import { processStudentIdOcr, OcrExtractedData } from "@/backend/ocr";
import { ImagePickerButton } from "@/components/ImagePickerButton";
import ImageUpload from "@/components/ImageUpload";
import Colors from "@/constants/Colors";
import { KNUST_PROGRAMMES, LOCATION_OPTIONS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IdCard, LocateFixed, MapPin, Phone } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

const Verify = () => {
  const router = useRouter();
  const { fullName, email, password } = useLocalSearchParams<{
    fullName?: string;
    email?: string;
    password?: string;
  }>();

  const [program, setProgram] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [studentRef, setStudentRef] = useState("");
  const [phone, setPhone] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [studentCardImageUrl, setStudentCardImageUrl] = useState<string>("");

  const [ocrResult, setOcrResult] = useState<OcrExtractedData | null>(null);

  const [errors, setErrors] = useState<{
    studentId?: string;
    studentRef?: string;
    program?: string;
    phone?: string;
    locationType?: string;
    address?: string;
    location?: string;
  }>({});

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      if (user?.id) {
        setUserId(user.id);
      }
    });
  }, []);

  const isOcrComplete = (data: OcrExtractedData | null): boolean => {
    if (!data) return false;
    return Boolean(
      data.fullName &&
        data.ReferenceNumber &&
        data.studentID &&
        data.dateOfExpiry &&
        data.course
    );
  };

  const handleStudentIdChange = (text: string) => {
    setStudentId(text);
    if (errors.studentId) setErrors((prev) => ({ ...prev, studentId: undefined }));
  };

  const handleStudentRefChange = (text: string) => {
    setStudentRef(text);
    if (errors.studentRef) setErrors((prev) => ({ ...prev, studentRef: undefined }));
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
  };

  const handleProgramChange = (val: string) => {
    setProgram(val);
    if (errors.program) setErrors((prev) => ({ ...prev, program: undefined }));
  };

  const handleLocationTypeChange = (val: string) => {
    setLocationType(val);
    if (errors.locationType) setErrors((prev) => ({ ...prev, locationType: undefined }));
  };

  const handleImageUploaded = async (uploadedPublicUrl: string) => {
    console.log("Image successfully uploaded. Triggering OCR.space...");
    setStudentCardImageUrl(uploadedPublicUrl);
    const ocrData = await processStudentIdOcr(uploadedPublicUrl);
    setOcrResult(ocrData);

    if (!ocrData || !isOcrComplete(ocrData)) {
      Alert.alert(
        "ID Verification Error",
        "Unable to extract all required details (Full Name, Student ID, Reference Number, Date of Expiry, and Course) from your Student ID card. Please upload a clearer photo of your official Student ID card."
      );
    }

    if (ocrData) {
      if (ocrData.studentID) {
        setStudentId(ocrData.studentID);
        if (errors.studentId) setErrors((prev) => ({ ...prev, studentId: undefined }));
      }

      if (ocrData.ReferenceNumber) {
        setStudentRef(ocrData.ReferenceNumber);
        if (errors.studentRef) setErrors((prev) => ({ ...prev, studentRef: undefined }));
      }

      if (ocrData.course) {
        const ocrCourseLower = ocrData.course.toLowerCase();
        const cleanOcrCourse = ocrCourseLower
          .replace(
            /^b\.?sc\s*|b\.?a\s*|bachelor\s*(?:of\s*science|of\s*arts)?\s*(?:in)?\s*/i,
            ""
          )
          .trim();

        const matched = KNUST_PROGRAMMES.find((item) => {
          const itemLabelLower = item.label.toLowerCase();
          const cleanItemLabel = itemLabelLower
            .replace(
              /^b\.?sc\s*|b\.?a\s*|bachelor\s*(?:of\s*science|of\s*arts)?\s*(?:in)?\s*/i,
              ""
            )
            .trim();

          return (
            itemLabelLower.includes(ocrCourseLower) ||
            ocrCourseLower.includes(itemLabelLower) ||
            (cleanOcrCourse.length > 3 &&
              cleanItemLabel.includes(cleanOcrCourse)) ||
            (cleanOcrCourse.length > 3 &&
              cleanOcrCourse.includes(cleanItemLabel))
          );
        });

        if (matched) {
          console.log(
            `Matched OCR course "${ocrData.course}" -> "${matched.label}" (${matched.value})`
          );
          setProgram(matched.value);
          if (errors.program) setErrors((prev) => ({ ...prev, program: undefined }));
        }
      }
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Permission to access location was denied"
        );
        setLocationLoading(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
    } catch (error) {
      console.error("Error getting location: ", error);
      Alert.alert(
        "Location Error",
        "Error getting location. Please make sure location services are enabled."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    const newErrors: typeof errors = {};

    if (!studentId.trim()) {
      newErrors.studentId = "Please enter your Student ID number.";
    }
    if (!studentRef.trim()) {
      newErrors.studentRef = "Please enter your Student Reference number.";
    }
    if (!program) {
      newErrors.program = "Please choose a program of study.";
    }
    if (!phone.trim()) {
      newErrors.phone = "Please enter your active phone number.";
    }
    if (!locationType) {
      newErrors.locationType = "Please choose a location type.";
    }
    if (!address.trim()) {
      newErrors.address = "Please enter your location description (address).";
    }
    if (!latitude || !longitude) {
      newErrors.location = "Please click 'Get Current Location' to acquire your coordinates.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!imageUri) {
      Alert.alert(
        "Missing Student ID Photo",
        "Please upload a photo of your Student ID card."
      );
      return;
    }

    if (!ocrResult || !isOcrComplete(ocrResult)) {
      Alert.alert(
        "Invalid Student ID Card",
        "Unable to verify all required information (Full Name, Student ID, Reference Number, Expiry Date, and Course) from your Student ID card. Please upload a clear picture of your official Student ID card."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Get current authenticated user ID
      let activeUserId: string | undefined = userId;
      let currentUserEmail: string | undefined;
      const { user: currentUser } = await getCurrentUser();
      if (currentUser?.id) {
        activeUserId = currentUser.id;
        currentUserEmail = currentUser.email;
      } else if (email && password) {
        const { data: signInData } = await signInUser(email, password);
        activeUserId = signInData?.user?.id;
        currentUserEmail = signInData?.user?.email;
      }

      if (!activeUserId) {
        Alert.alert(
          "Authentication Error",
          "Could not find active user session. Please sign in again."
        );
        setIsSubmitting(false);
        return;
      }

      // Step 2: Update verification details in users table
      const { error: updateError } = await updateUserVerification(activeUserId, {
        name: ocrResult.fullName || fullName || undefined,
        email: email || currentUserEmail || undefined,
        student_id_number: studentId.trim(),
        student_reference_number: studentRef.trim(),
        program_of_study: program || "",
        phone: phone.trim(),
        location_type: locationType || "",
        address: address.trim(),
        student_card_image_url: studentCardImageUrl || undefined,
        latitude: latitude,
        longitude: longitude,
        is_verified: true,
      });

      if (updateError) {
        Alert.alert(
          "Verification Failed",
          "Failed to save verification info: " + updateError
        );
        setIsSubmitting(false);
        return;
      }

      Alert.alert("Success", "Verification details submitted successfully!");
      // Proceed to the home page using replace
      router.replace({
        pathname: "/(resident)/home",
        params: { phone: phone.trim() },
      });
    } catch (err: any) {
      console.error("Verification submit error:", err);
      Alert.alert("Error", err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.verifyStyle}
        >
          <View>
            <Text
              style={{
                color: Colors.light.text,
                fontFamily: typography.medium,
                fontSize: 24,
                textAlign: "center",
                marginVertical: 16,
              }}
            >
              Student Verification
            </Text>
          </View>
          <View style={styles.inputView}>
            <CustomInput
              placeholder="Enter ID number"
              Icon={<IdCard size={19} color={"#000"} strokeWidth={1.5} />}
              keyboardType={true}
              label="Student ID number"
              value={studentId}
              onChangeText={handleStudentIdChange}
              showError={errors.studentId}
            />
            <CustomInput
              placeholder="Enter Reference number"
              Icon={<IdCard size={19} color={"#000"} strokeWidth={1.5} />}
              keyboardType={true}
              label="Student Reference number"
              value={studentRef}
              onChangeText={handleStudentRefChange}
              showError={errors.studentRef}
            />
            {imageUri && (
              <ImageUpload
                imageUri={imageUri}
                userId={userId}
                setDone={setUploadDone}
                onUploaded={handleImageUploaded}
              />
            )}
            <ImagePickerButton
              setImage={setImageUri}
              disable={uploadDone || isSubmitting || locationLoading}
            />
            <DropdownMenu
              label="Program of Study"
              options={KNUST_PROGRAMMES}
              value={program}
              placeholder="Choose a course…"
              onChange={(opt) => handleProgramChange(String(opt.value))}
              search={true}
              showError={errors.program}
              disabled={isSubmitting || locationLoading}
            />
            <CustomInput
              placeholder="+1 (555) 000 0000"
              Icon={<Phone size={19} color={"#000"} strokeWidth={1.5} />}
              label="Active Phone number"
              keyboardType={true}
              value={phone}
              onChangeText={handlePhoneChange}
              showError={errors.phone}
            />
            <View style={styles.verifyLocationStyle}>
              <DropdownMenu
                label="Location Type"
                options={LOCATION_OPTIONS}
                value={locationType}
                placeholder="Pick a location type…"
                onChange={(opt) => handleLocationTypeChange(String(opt.value))}
                showError={errors.locationType}
                disabled={isSubmitting || locationLoading}
              />
              <CustomInput
                placeholder="e.g. Room 304, Block B, Paradise Regained Hostel"
                Icon={<MapPin size={20} color={Colors.light.accent} />}
                label="Location Description (Address)"
                value={address}
                onChangeText={handleAddressChange}
                showError={errors.address}
              />
              <CustomButton
                text={
                  latitude && longitude
                    ? "Location Acquired (Get Again)"
                    : "Get Current Location"
                }
                isLoading={locationLoading}
                disabled={isSubmitting || locationLoading}
                onPress={handleGetCurrentLocation}
                Icon={<LocateFixed size={20} color={Colors.dark.text} />}
              />
              {errors.location ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.light.error,
                    fontFamily: typography.medium,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  {errors.location}
                </Text>
              ) : null}
              {latitude && longitude ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.light.text,
                    opacity: 0.6,
                    fontFamily: typography.regular,
                    marginTop: 6,
                    textAlign: "center",
                  }}
                >
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </Text>
              ) : null}
            </View>

            <CustomButton
              text={"Verify"}
              onPress={handleVerifySubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting || locationLoading}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "flex-end",
              marginVertical: 16,
            }}
          >
            <Text>{"You can "}</Text>
            <TouchableOpacity
              onPress={() => {}}
              disabled={isSubmitting || locationLoading}
            >
              <Text style={{ color: Colors.light.accent }}>skip</Text>
            </TouchableOpacity>
            <Text>{" this and complete it later"}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Verify;
