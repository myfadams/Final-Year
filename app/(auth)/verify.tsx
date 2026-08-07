import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import DropdownMenu from "@/components/DropdownMenu";

import {
  signUpUser,
  updateUserVerification,
  uploadStudentIdCard,
} from "@/backend/auth";
import { ImagePickerButton } from "@/components/ImagePickerButton";
import ImageUpload from "@/components/ImageUpload";
import Colors from "@/constants/Colors";
import { KNUST_PROGRAMMES, LOCATION_OPTIONS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IdCard, LocateFixed, MapPin, Phone } from "lucide-react-native";
import React, { useState } from "react";
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

  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Permission to access location was denied",
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
        "Error getting location. Please make sure location services are enabled.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!fullName || !email || !password) {
      Alert.alert(
        "Registration Error",
        "Missing registration details. Please return to the Sign Up screen.",
      );
      return;
    }
    if (!studentId.trim()) {
      Alert.alert("Validation Error", "Please enter your Student ID number.");
      return;
    }
    if (!studentRef.trim()) {
      Alert.alert(
        "Validation Error",
        "Please enter your Student Reference number.",
      );
      return;
    }
    if (!imageUri) {
      Alert.alert(
        "Validation Error",
        "Please upload a photo of your Student ID card.",
      );
      return;
    }
    if (!program) {
      Alert.alert("Validation Error", "Please choose a program of study.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Validation Error", "Please enter your active phone number.");
      return;
    }
    if (!locationType) {
      Alert.alert("Validation Error", "Please choose a location type.");
      return;
    }
    if (!address.trim()) {
      Alert.alert(
        "Validation Error",
        "Please enter your location description (address).",
      );
      return;
    }
    if (!latitude || !longitude) {
      Alert.alert(
        "Validation Error",
        "Please acquire your current coordinates.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Sign up user
      const { data: signUpData, error: signUpError } = await signUpUser(
        email,
        password,
        fullName,
      );
      if (signUpError || !signUpData?.user) {
        Alert.alert(
          "Registration Failed",
          signUpError || "Could not register user.",
        );
        setIsSubmitting(false);
        return;
      }

      const userId = signUpData.user.id;

      // Step 2: Upload Student ID Card image
      let studentCardImageUrl = "";
      const fileName = imageUri.split("/").pop() || "id_card.jpg";
      const { publicUrl, error: uploadError } = await uploadStudentIdCard(
        userId,
        imageUri,
        fileName,
      );
      if (uploadError) {
        Alert.alert(
          "Upload Warning",
          "Could not upload ID Card image: " + uploadError,
        );
      } else if (publicUrl) {
        studentCardImageUrl = publicUrl;
      }

      // Step 3: Update verification details in users table
      const { error: updateError } = await updateUserVerification(userId, {
        student_id_number: studentId.trim(),
        student_reference_number: studentRef.trim(),
        program_of_study: program,
        phone: phone.trim(),
        location_type: locationType,
        address: address.trim(),
        student_card_image_url: studentCardImageUrl || undefined,
        latitude: latitude,
        longitude: longitude,
      });

      if (updateError) {
        Alert.alert(
          "Verification Failed",
          "Failed to save verification info: " + updateError,
        );
        setIsSubmitting(false);
        return;
      }

      Alert.alert("Success", "Verification details submitted successfully!");
      // Proceed to the OTP verifyNumber screen
      router.navigate({
        pathname: "/(auth)/waitingVerify",
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
              onChangeText={setStudentId}
            />
            <CustomInput
              placeholder="Enter Reference number"
              Icon={<IdCard size={19} color={"#000"} strokeWidth={1.5} />}
              keyboardType={true}
              label="Student Reference number"
              value={studentRef}
              onChangeText={setStudentRef}
            />
            {imageUri && (
              <ImageUpload imageUri={imageUri} setDone={setUploadDone} />
            )}
            <ImagePickerButton setImage={setImageUri} disable={uploadDone} />
            {/* <CustomInput
            placeholder="Program of Study"
            Icon={<GraduationCap size={19} color={"#000"} strokeWidth={1.5} />}
            label=""
          /> */}
            <DropdownMenu
              label="Program of Study"
              options={KNUST_PROGRAMMES}
              value={program}
              placeholder="Choose a course…"
              onChange={(opt) => setProgram(String(opt.value))}
              search={true}
            />
            <CustomInput
              placeholder="+1 (555) 000 0000"
              Icon={<Phone size={19} color={"#000"} strokeWidth={1.5} />}
              label="Active Phone number"
              keyboardType={true}
              value={phone}
              onChangeText={setPhone}
            />
            {/* <CustomInput
            placeholder="Name"
            Icon={<User size={19} color={"#000"} strokeWidth={1.5} />}
          /> */}
            <View style={styles.verifyLocationStyle}>
              {/* <CustomButton /> */}
              <DropdownMenu
                label="Location Type"
                options={LOCATION_OPTIONS}
                value={locationType}
                placeholder="Pick a location type…"
                onChange={(opt) => setLocationType(String(opt.value))}
              />
              <CustomInput
                placeholder="e.g. Room 304, Block B, Paradise Regained Hostel"
                Icon={<MapPin size={20} color={Colors.light.accent} />}
                label="Location Description (Address)"
                value={address}
                onChangeText={(text) => setAddress(text)}
              />
              <CustomButton
                text={
                  latitude && longitude
                    ? "Location Acquired (Get Again)"
                    : "Get Current Location"
                }
                isLoading={locationLoading}
                onPress={handleGetCurrentLocation}
                Icon={<LocateFixed size={20} color={Colors.dark.text} />}
              />
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
              disabled={isSubmitting}
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
            <TouchableOpacity onPress={() => {}}>
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
